import { Router } from 'express';
import mongoose from 'mongoose';
import { Activity, Client, Mailbox, Thread } from '../models/index.js';
import { ah } from '../middleware/auth.js';
import { buildCtx, classifyAndSave, label } from '../services/mail.js';
import { draftReply } from '../services/ai/index.js';
import { isWaiting, threadDetail, threadListItem } from '../services/serialize.js';

const r = Router();

const open = (t) => !t.archived && !t.completed;
export const SEGMENTS = {
  inbox: open,
  review: (t) => open(t) && t.ai?.needsReview && t.responsibilitySource === 'ai',
  assistant: (t) => open(t) && t.responsibility === 'assistant',
  client: (t) => open(t) && t.responsibility === 'client',
  none: (t) => open(t) && t.responsibility === 'none',
  action: (t) => open(t) && t.responsibility !== 'none' && t.ai?.categories?.includes('action'),
  waiting: (t) => isWaiting(t),
  meetings: (t) => open(t) && t.ai?.categories?.includes('meeting'),
  important: (t) => open(t) && (t.starred || t.ai?.priority === 'high' || t.ai?.categories?.includes('important')),
  general: (t) => open(t) && t.responsibility === 'none' && !isWaiting(t) && !t.ai?.categories?.includes('meeting'),
  unread: (t) => open(t) && t.unread,
  done: (t) => t.completed && !t.archived,
  archived: (t) => t.archived,
};

/** All threads for the user's active (non-paused) mailboxes. Small data set, so we filter in memory. */
export async function loadThreads(userId) {
  const active = await Mailbox.find({ owner: userId, status: { $ne: 'disconnected' } }).distinct('_id');
  return Thread.find({ owner: userId, mailbox: { $in: active } }).sort({ lastMessageAt: -1 });
}

function matches(t, q) {
  const hay = `${t.subject} ${t.messages.map((m) => `${m.from?.name} ${m.from?.email} ${m.body}`).join(' ')} ${t.ai?.summary || ''}`.toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
}

r.get('/', ah(async (req, res) => {
  const { segment = 'inbox', q = '', mailbox } = req.query;
  const filter = SEGMENTS[segment] || SEGMENTS.inbox;
  let list = (await loadThreads(req.user._id)).filter(filter);
  if (mailbox && mailbox !== 'all') list = list.filter((t) => String(t.mailbox) === mailbox);
  if (q.trim()) list = list.filter((t) => matches(t, q.trim()));
  res.json(list.map(threadListItem));
}));

r.get('/counts', ah(async (req, res) => {
  const { mailbox } = req.query;
  let all = await loadThreads(req.user._id);
  if (mailbox && mailbox !== 'all') all = all.filter((t) => String(t.mailbox) === mailbox);
  const counts = {};
  for (const [k, f] of Object.entries(SEGMENTS)) counts[k] = all.filter(f).length;
  counts.unreadBySegment = {};
  for (const k of ['inbox', 'assistant', 'client', 'review']) counts.unreadBySegment[k] = all.filter((t) => SEGMENTS[k](t) && t.unread).length;
  res.json(counts);
}));

async function getOwned(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) { res.status(404).json({ error: 'Conversation not found.' }); return null; }
  const t = await Thread.findOne({ _id: req.params.id, owner: req.user._id });
  if (!t) res.status(404).json({ error: 'Conversation not found.' });
  return t;
}

r.get('/:id', ah(async (req, res) => {
  const t = await getOwned(req, res);
  if (!t) return;
  if (t.unread && req.query.markRead !== 'false') { t.unread = false; await t.save(); }
  res.json(threadDetail(t));
}));

r.patch('/:id', ah(async (req, res) => {
  const t = await getOwned(req, res);
  if (!t) return;
  const { unread, starred, archived, completed, responsibility } = req.body || {};
  if (typeof unread === 'boolean') t.unread = unread;
  if (typeof starred === 'boolean') t.starred = starred;
  if (typeof archived === 'boolean') t.archived = archived;
  if (typeof completed === 'boolean') {
    t.completed = completed;
    if (completed) await Activity.create({ owner: t.owner, client: t.client, thread: t._id, actor: 'assistant', type: 'completed', text: `Marked “${t.subject}” as done` });
  }
  if (responsibility && ['assistant', 'client', 'none'].includes(responsibility) && responsibility !== t.responsibility) {
    const before = t.responsibility;
    t.responsibility = responsibility;
    t.responsibilitySource = 'assistant';
    if (responsibility === 'client') { t.clientStatus = null; t.clientNote = undefined; }
    await Activity.create({ owner: t.owner, client: t.client, thread: t._id, actor: 'assistant', type: 'reassigned', text: `Moved “${t.subject}” from ${label(before)} → ${label(responsibility)}` });
  }
  if (responsibility === 'ai') {
    t.responsibility = t.ai?.responsibility || t.responsibility;
    t.responsibilitySource = 'ai';
  }
  await t.save();
  res.json(threadDetail(t));
}));

r.post('/:id/reclassify', ah(async (req, res) => {
  const t = await getOwned(req, res);
  if (!t) return;
  t.responsibilitySource = 'ai';
  await classifyAndSave(t, { reason: 'manual' });
  res.json(threadDetail(t));
}));

r.post('/:id/draft', ah(async (req, res) => {
  const t = await getOwned(req, res);
  if (!t) return;
  const { tone = 'professional', instructions = '' } = req.body || {};
  const ctx = await buildCtx(t);
  const { body, engine } = await draftReply(t, ctx, { tone, instructions: String(instructions).slice(0, 500) });
  t.draft = { body, tone, generatedBy: engine, updatedAt: new Date() };
  await t.save();
  res.json(threadDetail(t));
}));

r.put('/:id/draft', ah(async (req, res) => {
  const t = await getOwned(req, res);
  if (!t) return;
  const body = String(req.body?.body || '');
  t.draft = body.trim() ? { ...(t.draft?.toObject?.() || {}), body, updatedAt: new Date() } : undefined;
  await t.save();
  res.json(threadDetail(t));
}));

// "Send" is simulated: the approved reply is appended to the conversation as an outgoing message.
r.post('/:id/send', ah(async (req, res) => {
  const t = await getOwned(req, res);
  if (!t) return;
  const body = String(req.body?.body || '').trim();
  if (body.length < 2) return res.status(400).json({ error: 'Write a message before sending.' });
  const [mailbox, client] = await Promise.all([Mailbox.findById(t.mailbox), Client.findById(t.client)]);
  const lastInbound = [...t.messages].reverse().find((m) => m.direction === 'in');
  t.messages.push({
    from: { name: req.user.name, email: mailbox.address },
    to: [lastInbound?.from || t.messages[0].to?.[0]],
    date: new Date(), body, direction: 'out', sentBy: 'assistant',
  });
  t.lastMessageAt = new Date();
  t.draft = undefined;
  t.unread = false;
  t.responsibilitySource = 'ai';
  await classifyAndSave(t, { reason: 'sent' });
  await Activity.create({ owner: t.owner, client: client._id, thread: t._id, actor: 'assistant', type: 'replied', text: `Replied to “${t.subject}” on ${client.name.split(' ')[0]}'s behalf` });
  res.json(threadDetail(t));
}));

export default r;
