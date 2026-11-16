// Dashboard overview + "Ask Relay" AI questions.
import { Router } from 'express';
import { Activity, Client, Mailbox, Thread } from '../models/index.js';
import { ah } from '../middleware/auth.js';
import { askInbox } from '../services/ai/index.js';
import { buildCtx } from '../services/mail.js';
import { threadListItem } from '../services/serialize.js';
import { SEGMENTS, loadThreads } from './threads.js';

const r = Router();

r.get('/dashboard', ah(async (req, res) => {
  const [threads, mailboxes, client, activity] = await Promise.all([
    loadThreads(req.user._id),
    Mailbox.find({ owner: req.user._id }).sort({ createdAt: 1 }).lean(),
    Client.findOne({ owner: req.user._id }).lean(),
    Activity.find({ owner: req.user._id }).sort({ createdAt: -1 }).limit(12).lean(),
  ]);
  const by = (k) => threads.filter(SEGMENTS[k]);
  const prio = (t) => (t.ai?.priority === 'high' ? 2 : 0) + (t.unread ? 1 : 0);
  const now = Date.now();

  const upcoming = threads
    .filter(SEGMENTS.inbox)
    .flatMap((t) => (t.ai?.dates || []).map((d) => ({ threadId: String(t._id), subject: t.subject, label: d.label, date: d.date, kind: d.kind, responsibility: t.responsibility })))
    .filter((d) => +new Date(d.date) > now - 3600e3 && d.kind !== 'event' && /\d/.test(d.label))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 6);

  res.json({
    client,
    mailboxes,
    stats: {
      total: threads.filter((t) => !t.archived).length,
      unread: by('unread').length,
      important: by('important').length,
      action: by('action').length,
      waiting: by('waiting').length,
      assistant: by('assistant').length,
      client: by('client').length,
      none: by('none').length,
      review: by('review').length,
      done: by('done').length,
    },
    needsYou: [...by('review'), ...by('assistant').filter((t) => !SEGMENTS.review(t))]
      .sort((a, b) => prio(b) - prio(a) || b.lastMessageAt - a.lastMessageAt)
      .slice(0, 6).map(threadListItem),
    clientQueue: by('client').sort((a, b) => prio(b) - prio(a)).slice(0, 5).map(threadListItem),
    waiting: by('waiting').slice(0, 4).map(threadListItem),
    recent: threads.filter((t) => !t.archived).slice(0, 6).map(threadListItem),
    upcoming,
    activity,
    clientUpdates: activity.filter((a) => a.actor === 'client' && !a.seen).length,
  });
}));

r.post('/ai/ask', ah(async (req, res) => {
  const { question = '', threadId } = req.body || {};
  if (!question.trim()) return res.status(400).json({ error: 'Ask a question about the inbox.' });
  const threads = await loadThreads(req.user._id);
  const focus = threadId ? await Thread.findOne({ _id: threadId, owner: req.user._id }) : null;
  const ctx = focus ? await buildCtx(focus) : { assistant: req.user, client: await Client.findOne({ owner: req.user._id }).lean() };
  const result = await askInbox(question.slice(0, 500), threads.filter((t) => !t.archived), ctx, focus);
  const byId = new Map(threads.map((t) => [String(t._id), t]));
  res.json({ ...result, threads: result.threadIds.map((id) => byId.get(id)).filter(Boolean).map(threadListItem) });
}));

export default r;
