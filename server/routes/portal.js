/**
 * Minimal client-facing view. Accessed with a private link (no password) that
 * the assistant shares with their client. Only exposes "Client to Reply" mail.
 */
import { Router } from 'express';
import mongoose from 'mongoose';
import { Activity, Client, Mailbox, Thread, User } from '../models/index.js';
import { ah } from '../middleware/auth.js';
import { threadDetail } from '../services/serialize.js';

const r = Router();

async function resolve(req, res) {
  const client = await Client.findOne({ portalToken: req.params.token }).lean();
  if (!client) { res.status(404).json({ error: 'This link is invalid or has been reset by your assistant.' }); return null; }
  return client;
}

const portalItem = (t) => {
  const d = threadDetail(t);
  return {
    id: d.id, subject: d.subject, from: d.from, lastMessageAt: d.lastMessageAt, messageCount: d.messageCount,
    summary: d.ai?.summary, why: d.ai?.clientReason || d.ai?.reason, keyPoints: d.ai?.keyPoints || [], dates: d.ai?.dates || [],
    priority: d.ai?.priority, unread: d.unread, clientStatus: d.clientStatus, clientNote: d.clientNote, clientActedAt: d.clientActedAt,
    responsibility: d.responsibility, completed: d.completed,
  };
};

async function activeMailboxes(client) {
  return Mailbox.find({ client: client._id, status: { $ne: 'disconnected' } }).distinct('_id');
}

r.get('/:token', ah(async (req, res) => {
  const client = await resolve(req, res);
  if (!client) return;
  const [assistant, mailboxes] = await Promise.all([User.findById(client.owner).lean(), activeMailboxes(client)]);
  const threads = await Thread.find({ client: client._id, mailbox: { $in: mailboxes }, archived: false }).sort({ lastMessageAt: -1 });
  const pending = threads.filter((t) => t.responsibility === 'client' && !t.completed);
  const recent = threads
    .filter((t) => t.clientStatus && t.clientActedAt && Date.now() - t.clientActedAt < 7 * 864e5)
    .sort((a, b) => b.clientActedAt - a.clientActedAt)
    .slice(0, 8);
  res.json({
    client: { name: client.name, title: client.title, company: client.company },
    assistant: { name: assistant?.name },
    pending: pending.map(portalItem),
    recent: recent.map(portalItem),
  });
}));

async function getThread(req, res, client) {
  if (!mongoose.isValidObjectId(req.params.id)) { res.status(404).json({ error: 'Email not found.' }); return null; }
  const t = await Thread.findOne({ _id: req.params.id, client: client._id });
  if (!t) res.status(404).json({ error: 'Email not found.' });
  return t;
}

r.get('/:token/threads/:id', ah(async (req, res) => {
  const client = await resolve(req, res);
  if (!client) return;
  const t = await getThread(req, res, client);
  if (!t) return;
  const d = threadDetail(t);
  res.json({ ...portalItem(t), messages: d.messages });
}));

// Client says they've dealt with it personally.
r.post('/:token/threads/:id/handled', ah(async (req, res) => {
  const client = await resolve(req, res);
  if (!client) return;
  const t = await getThread(req, res, client);
  if (!t) return;
  t.clientStatus = 'handled';
  t.clientActedAt = new Date();
  t.clientNote = String(req.body?.note || '').slice(0, 500) || undefined;
  t.completed = true;
  t.unread = false;
  await t.save();
  await Activity.create({ owner: t.owner, client: client._id, thread: t._id, actor: 'client', type: 'client_handled', text: `${client.name.split(' ')[0]} handled “${t.subject}” personally${t.clientNote ? ` — “${t.clientNote}”` : ''}` });
  res.json(portalItem(t));
}));

// Client hands the email over to the assistant (optionally with instructions).
r.post('/:token/threads/:id/handover', ah(async (req, res) => {
  const client = await resolve(req, res);
  if (!client) return;
  const t = await getThread(req, res, client);
  if (!t) return;
  t.clientStatus = 'handover';
  t.clientActedAt = new Date();
  t.clientNote = String(req.body?.note || '').slice(0, 500) || undefined;
  t.responsibility = 'assistant';
  t.responsibilitySource = 'client';
  t.completed = false;
  t.unread = true;
  await t.save();
  await Activity.create({ owner: t.owner, client: client._id, thread: t._id, actor: 'client', type: 'client_handover', text: `${client.name.split(' ')[0]} asked you to take over “${t.subject}”${t.clientNote ? ` — “${t.clientNote}”` : ''}` });
  res.json(portalItem(t));
}));

// Undo (e.g. tapped the wrong button)
r.post('/:token/threads/:id/undo', ah(async (req, res) => {
  const client = await resolve(req, res);
  if (!client) return;
  const t = await getThread(req, res, client);
  if (!t) return;
  t.clientStatus = null;
  t.clientNote = undefined;
  t.clientActedAt = undefined;
  t.responsibility = 'client';
  t.responsibilitySource = 'client';
  t.completed = false;
  await t.save();
  await Activity.create({ owner: t.owner, client: client._id, thread: t._id, actor: 'client', type: 'client_undo', text: `${client.name.split(' ')[0]} moved “${t.subject}” back to their own queue` });
  res.json(portalItem(t));
}));

export default r;
