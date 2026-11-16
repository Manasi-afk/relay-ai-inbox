// Client profile, connected mailboxes and onboarding.
import { Router } from 'express';
import crypto from 'node:crypto';
import { Activity, Client, Mailbox, Thread } from '../models/index.js';
import { ah } from '../middleware/auth.js';
import { deliverIncoming, label, startSync } from '../services/mail.js';
import { threadListItem } from '../services/serialize.js';

const r = Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

r.put('/client', ah(async (req, res) => {
  const { name = '', email = '', title = '', company = '' } = req.body || {};
  if (!name.trim()) return res.status(400).json({ error: "Please enter your client's name.", field: 'name' });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.', field: 'email' });
  const client = await Client.findOneAndUpdate(
    { owner: req.user._id },
    { $set: { name: name.trim(), email, title, company }, $setOnInsert: { owner: req.user._id } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  res.json(client);
}));

r.post('/client/rotate-link', ah(async (req, res) => {
  const client = await Client.findOneAndUpdate({ owner: req.user._id }, { portalToken: crypto.randomBytes(18).toString('base64url') }, { new: true });
  res.json(client);
}));

r.get('/mailboxes', ah(async (req, res) => {
  res.json(await Mailbox.find({ owner: req.user._id }).sort({ createdAt: 1 }));
}));

r.post('/mailboxes', ah(async (req, res) => {
  const { provider, address = '' } = req.body || {};
  if (!['gmail', 'outlook'].includes(provider)) return res.status(400).json({ error: 'Choose Gmail or Outlook.' });
  if (!EMAIL_RE.test(address)) return res.status(400).json({ error: 'Please enter the email address to connect.', field: 'address' });
  const client = await Client.findOne({ owner: req.user._id });
  if (!client) return res.status(400).json({ error: 'Add your client first.' });
  if (await Mailbox.exists({ owner: req.user._id, address: address.toLowerCase() })) {
    return res.status(409).json({ error: 'This mailbox is already connected.', field: 'address' });
  }
  const mailbox = await Mailbox.create({ owner: req.user._id, client: client._id, provider, address });
  await Activity.create({ owner: req.user._id, client: client._id, actor: 'assistant', type: 'connected', text: `Connected ${provider === 'gmail' ? 'Gmail' : 'Outlook'} account ${mailbox.address}` });
  res.status(201).json(await startSync(mailbox._id));
}));

r.post('/mailboxes/:id/sync', ah(async (req, res) => {
  const mailbox = await Mailbox.findOne({ _id: req.params.id, owner: req.user._id });
  if (!mailbox) return res.status(404).json({ error: 'Mailbox not found.' });
  mailbox.status = 'connected';
  mailbox.lastSyncedAt = new Date();
  await mailbox.save();
  res.json(mailbox);
}));

r.post('/mailboxes/:id/status', ah(async (req, res) => {
  const { status } = req.body || {};
  if (!['connected', 'disconnected'].includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  const mailbox = await Mailbox.findOneAndUpdate({ _id: req.params.id, owner: req.user._id }, { status, lastSyncedAt: status === 'connected' ? new Date() : undefined }, { new: true });
  if (!mailbox) return res.status(404).json({ error: 'Mailbox not found.' });
  await Activity.create({ owner: req.user._id, client: mailbox.client, actor: 'assistant', type: 'mailbox', text: `${status === 'connected' ? 'Reconnected' : 'Paused sync for'} ${mailbox.address}` });
  res.json(mailbox);
}));

r.delete('/mailboxes/:id', ah(async (req, res) => {
  const mailbox = await Mailbox.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
  if (!mailbox) return res.status(404).json({ error: 'Mailbox not found.' });
  await Thread.deleteMany({ mailbox: mailbox._id });
  await Activity.create({ owner: req.user._id, client: mailbox.client, actor: 'assistant', type: 'mailbox', text: `Removed ${mailbox.address}` });
  res.json({ ok: true });
}));

// Simulates a provider webhook / push notification delivering a new email.
r.post('/mailboxes/:id/simulate', ah(async (req, res) => {
  const mailbox = await Mailbox.findOne({ _id: req.params.id, owner: req.user._id });
  if (!mailbox) return res.status(404).json({ error: 'Mailbox not found.' });
  if (mailbox.status !== 'connected') return res.status(400).json({ error: 'Reconnect this mailbox to receive new mail.' });
  const result = await deliverIncoming(mailbox);
  if (!result) return res.status(404).json({ error: 'No more sample emails for this mailbox.' });
  const { thread, kind } = result;
  await Activity.create({
    owner: req.user._id, client: thread.client, thread: thread._id, actor: 'ai', type: 'classified',
    text: `${kind === 'reply' ? 'New reply in' : 'New email'} “${thread.subject}” → ${label(thread.responsibility)}${thread.ai?.needsReview ? ' (flagged for review)' : ''}`,
  });
  res.json({ kind, thread: threadListItem(thread) });
}));

r.post('/onboarding/complete', ah(async (req, res) => {
  req.user.onboarded = true;
  await req.user.save();
  res.json({ ok: true });
}));

r.get('/activity', ah(async (req, res) => {
  res.json(await Activity.find({ owner: req.user._id }).sort({ createdAt: -1 }).limit(30).lean());
}));

r.post('/activity/seen', ah(async (req, res) => {
  await Activity.updateMany({ owner: req.user._id, actor: 'client', seen: false }, { seen: true });
  res.json({ ok: true });
}));

export default r;
