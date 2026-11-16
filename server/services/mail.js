import { Activity, Client, Mailbox, Thread, User } from '../models/index.js';
import { classifyThread } from './ai/index.js';
import { INCOMING, PERSONAL_THREADS, WORK_THREADS, render } from '../data/sampleEmails.js';
import { firstName } from './ai/text.js';

export async function buildCtx(thread) {
  const [client, mailbox, assistant] = await Promise.all([
    Client.findById(thread.client).lean(),
    Mailbox.findById(thread.mailbox).lean(),
    User.findById(thread.owner).lean(),
  ]);
  return { client, mailbox, assistant };
}

/**
 * Run AI classification on a thread and store it.
 * Manual overrides are respected: if a human set the owner, a NEW message
 * resets it to AI so the conversation is re-evaluated (requirement: "reconsider
 * classifications when new messages arrive").
 */
export async function classifyAndSave(thread, { reason = 'new', ctx } = {}) {
  ctx = ctx || (await buildCtx(thread));
  const before = thread.responsibility;
  const ai = await classifyThread(thread, ctx);
  thread.ai = ai;
  if (thread.responsibilitySource === 'ai' || reason === 'new-message') {
    thread.responsibility = ai.responsibility;
    thread.responsibilitySource = 'ai';
  }
  // a new message re-opens a conversation the client had already handled
  if (reason === 'new-message') {
    thread.completed = false;
    thread.archived = false;
    thread.clientStatus = null;
  }
  thread.classifying = false;
  await thread.save();

  if (reason === 'new-message' && before && before !== thread.responsibility) {
    await Activity.create({
      owner: thread.owner, client: thread.client, thread: thread._id, actor: 'ai', type: 'reclassified',
      text: `Re-classified “${thread.subject}” from ${label(before)} → ${label(thread.responsibility)} after a new reply`,
    });
  }
  return thread;
}

export const label = (r) => ({ assistant: 'Assistant to Reply', client: 'Client to Reply', none: 'No Reply Needed' })[r] || r;

function buildMessages(spec, vars, client, mailbox, now = Date.now()) {
  const me = { name: client.name, email: mailbox.address };
  return spec.messages.map((m) => {
    const out = Boolean(m.out);
    const fromName = render(m.from[0], vars);
    const fromEmail = render(m.from[1], vars);
    const counterpart = spec.to ? { name: spec.to[0], email: spec.to[1] } : { name: render(spec.messages.find((x) => !x.out)?.from[0] || '', vars), email: spec.messages.find((x) => !x.out)?.from[1] };
    return {
      from: { name: fromName, email: fromEmail },
      to: [out ? counterpart : me],
      date: new Date(now - m.ago * 3600e3),
      body: render(m.body, vars),
      direction: out ? 'out' : 'in',
      sentBy: out ? 'assistant' : 'external',
    };
  });
}

/** Simulated provider sync: imports sample mail and classifies it in the background. */
export async function startSync(mailboxId) {
  const mailbox = await Mailbox.findById(mailboxId);
  const [client, assistant] = await Promise.all([Client.findById(mailbox.client), User.findById(mailbox.owner)]);
  const specs = mailbox.provider === 'gmail' ? WORK_THREADS : PERSONAL_THREADS;
  const vars = { client: firstName(client.name), clientFull: client.name, assistant: assistant.name, mailbox: mailbox.address };

  mailbox.status = 'syncing';
  mailbox.syncProgress = 0;
  mailbox.syncTotal = specs.length;
  await mailbox.save();

  // Run asynchronously so the UI can show live progress.
  (async () => {
    const ctx = { client: client.toObject(), mailbox: mailbox.toObject(), assistant: assistant.toObject() };
    const existing = await Thread.countDocuments({ mailbox: mailbox._id });
    if (!existing) {
      const docs = await Thread.insertMany(
        specs.map((spec) => {
          const messages = buildMessages(spec, vars, client, mailbox);
          return {
            owner: mailbox.owner, client: client._id, mailbox: mailbox._id,
            subject: spec.subject, messages, lastMessageAt: messages[messages.length - 1].date,
            unread: spec.unread ?? true, starred: Boolean(spec.starred), classifying: true,
          };
        })
      );
      let done = 0;
      const queue = [...docs];
      const worker = async () => {
        while (queue.length) {
          const t = queue.shift();
          try { await classifyAndSave(t, { ctx }); } catch (e) { console.error('classify failed', e.message); }
          done += 1;
          await Mailbox.updateOne({ _id: mailbox._id }, { syncProgress: done });
        }
      };
      await Promise.all([worker(), worker(), worker()]);
    }
    await Mailbox.updateOne({ _id: mailbox._id }, { status: 'connected', lastSyncedAt: new Date(), syncProgress: specs.length });
    await Activity.create({ owner: mailbox.owner, client: client._id, actor: 'system', type: 'synced', text: `Synced ${specs.length} conversations from ${mailbox.address} and classified them` });
  })().catch(async (e) => {
    console.error('sync failed', e);
    await Mailbox.updateOne({ _id: mailbox._id }, { status: 'error', lastError: e.message });
  });

  return mailbox;
}

/** Deliver the next simulated email into a mailbox and classify it immediately. */
export async function deliverIncoming(mailbox) {
  const [client, assistant] = await Promise.all([Client.findById(mailbox.client), User.findById(mailbox.owner)]);
  const vars = { client: firstName(client.name), clientFull: client.name, assistant: assistant.name, mailbox: mailbox.address };
  const me = { name: client.name, email: mailbox.address };

  for (let i = 0; i < INCOMING.length; i++) {
    const spec = INCOMING[(mailbox.incomingCursor + i) % INCOMING.length];
    const msg = {
      from: { name: render(spec.message.from[0], vars), email: spec.message.from[1] },
      to: [me], date: new Date(), body: render(spec.message.body, vars), direction: 'in', sentBy: 'external',
    };
    let thread;
    if (spec.kind === 'reply') {
      thread = await Thread.findOne({ mailbox: mailbox._id, subject: { $in: [spec.matchSubject, `Re: ${spec.matchSubject}`] } });
      if (!thread) continue;
      // don't deliver the same reply twice in a row
      if (thread.messages[thread.messages.length - 1].body === msg.body) continue;
      thread.messages.push(msg);
      thread.subject = thread.subject.startsWith('Re:') ? thread.subject : `Re: ${thread.subject}`;
    } else {
      thread = new Thread({ owner: mailbox.owner, client: client._id, mailbox: mailbox._id, subject: spec.subject, messages: [msg] });
    }
    thread.lastMessageAt = msg.date;
    thread.unread = true;
    mailbox.incomingCursor = (mailbox.incomingCursor + i + 1) % INCOMING.length;
    mailbox.lastSyncedAt = new Date();
    await mailbox.save();
    await classifyAndSave(thread, { reason: spec.kind === 'reply' ? 'new-message' : 'new' });
    return { thread, kind: spec.kind };
  }
  return null;
}
