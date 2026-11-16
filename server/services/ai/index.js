/**
 * AI facade used by the routes.
 *  - classifyThread : who should reply + summary + categories + dates
 *  - draftReply     : reply draft for the assistant to review
 *  - askInbox       : natural-language questions about the inbox
 * Every function uses the configured LLM and falls back to the rule engine.
 */
import { aiProvider } from '../../config.js';
import { callLLM, engineName } from './llm.js';
import { classifyHeuristic, draftHeuristic } from './heuristic.js';
import { firstName, parseJsonLoose, truncate } from './text.js';

const fmt = (d) => new Date(d).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function threadTranscript(thread, max = 8) {
  const msgs = thread.messages.slice(-max);
  return msgs
    .map((m, i) => `--- Message ${thread.messages.length - msgs.length + i + 1} (${m.direction === 'out' ? `SENT from the client's mailbox by the ${m.sentBy}` : 'RECEIVED'}) ---
From: ${m.from.name} <${m.from.email}>
Date: ${fmt(m.date)}
${truncate(m.body, 2500)}`)
    .join('\n\n');
}

/* ------------------------------ Classification ------------------------------ */
const CLASSIFY_SYSTEM = `You are the triage engine inside "Relay", an email tool used by a personal assistant (PA) who manages the inbox of their client (a busy executive).
For each conversation decide WHO must write the next reply:
- "assistant": the PA can reply on the client's behalf (scheduling/rescheduling, bookings, confirmations, routine business or admin requests, sending documents, invoices, follow-ups).
- "client": only the client can answer personally (personal decisions or approvals, sensitive/confidential business matters, compensation, legal/commercial judgement calls, statements in the client's own voice, close personal relationships, explicit requests for the client's input).
- "none": no reply needed (newsletters, notifications, receipts, FYIs, already-resolved threads, or the last message was SENT from the client's mailbox so we are waiting on the other side).
Rules: consider the whole conversation, but the latest message matters most. Do not treat every email as needing a reply. If genuinely ambiguous, pick the most likely owner, set needsReview=true and confidence below 0.6.
Categories (any that apply): "action" (someone on our side must act), "waiting" (we are waiting on the other party), "meeting" (scheduling, meetings, appointments, bookings), "important" (high-stakes, urgent, sensitive or time-critical), "general" (informational).
Extract concrete dates/times (meetings, deadlines, events) as ISO 8601 with timezone offset, resolved against the message date.
Respond with ONLY a JSON object, no prose:
{"responsibility":"assistant|client|none","confidence":0-1,"needsReview":bool,"reason":"1-2 sentences explaining the decision to the PA, quoting the decisive phrase","clientReason":"if client: one sentence telling the client why THEY must reply, addressed as 'you'; else empty","summary":"<=45 words","keyPoints":["<=3 short bullets of key facts, asks, amounts"],"categories":["..."],"dates":[{"label":"short label","date":"ISO","kind":"meeting|deadline|event"}],"priority":"high|normal|low"}`;

function sanitize(raw, fallback) {
  const pick = (v, allowed, d) => (allowed.includes(v) ? v : d);
  const out = {
    responsibility: pick(raw.responsibility, ['assistant', 'client', 'none'], fallback.responsibility),
    confidence: Math.max(0, Math.min(1, Number(raw.confidence ?? 0.7))),
    needsReview: Boolean(raw.needsReview),
    reason: String(raw.reason || fallback.reason).slice(0, 400),
    clientReason: String(raw.clientReason || '').slice(0, 300),
    summary: String(raw.summary || fallback.summary).slice(0, 400),
    keyPoints: (Array.isArray(raw.keyPoints) ? raw.keyPoints : []).slice(0, 4).map((s) => String(s).slice(0, 160)),
    categories: (Array.isArray(raw.categories) ? raw.categories : []).filter((c) => ['action', 'waiting', 'meeting', 'important', 'general'].includes(c)),
    dates: (Array.isArray(raw.dates) ? raw.dates : [])
      .map((d) => ({ label: String(d.label || 'Date').slice(0, 80), date: new Date(d.date), kind: pick(d.kind, ['meeting', 'deadline', 'event'], 'event') }))
      .filter((d) => !isNaN(d.date))
      .slice(0, 4),
    priority: pick(raw.priority, ['high', 'normal', 'low'], 'normal'),
  };
  if (out.confidence < 0.6) out.needsReview = true;
  if (!out.categories.length) out.categories = ['general'];
  return out;
}

export async function classifyThread(thread, ctx) {
  const fallback = classifyHeuristic(thread, ctx);
  let result = fallback;
  let engine = 'rules';
  if (aiProvider !== 'heuristic') {
    try {
      const text = await callLLM({
        system: CLASSIFY_SYSTEM,
        user: `Today: ${fmt(new Date())}
Client: ${ctx.client.name} (${ctx.client.title || 'executive'}${ctx.client.company ? `, ${ctx.client.company}` : ''}) <${ctx.mailbox.address}>
Personal assistant: ${ctx.assistant.name}

Subject: ${thread.subject}
${threadTranscript(thread)}`,
      });
      result = sanitize(parseJsonLoose(text), fallback);
      engine = engineName();
    } catch (err) {
      console.warn('[ai] classify fell back to rules:', err.message);
    }
  }
  return { ...result, engine, classifiedAt: new Date(), messageCount: thread.messages.length };
}

/* --------------------------------- Drafting --------------------------------- */
export async function draftReply(thread, ctx, opts = {}) {
  if (aiProvider !== 'heuristic') {
    try {
      const text = await callLLM({
        system: `You write email replies for a personal assistant (${ctx.assistant.name}) who replies on behalf of their client ${ctx.client.name}. Write in first person as the assistant (e.g. "I'm writing on behalf of ${firstName(ctx.client.name)}"). Tone: ${opts.tone || 'professional'}. Never invent facts, commitments, prices or decisions the client has not made; if the reply needs the client's decision, say it is being reviewed and you will revert. Keep it under 140 words. Sign off as "${ctx.assistant.name}\nOffice of ${ctx.client.name}". Output only the email body, no subject line.`,
        user: `${opts.instructions ? `Extra instructions from the assistant: ${opts.instructions}\n\n` : ''}Subject: ${thread.subject}\n${threadTranscript(thread, 6)}`,
        temperature: 0.5,
        maxTokens: 600,
      });
      if (text.trim()) return { body: text.trim(), engine: engineName() };
    } catch (err) {
      console.warn('[ai] draft fell back to template:', err.message);
    }
  }
  return { body: draftHeuristic(thread, ctx, opts), engine: 'rules' };
}

/* ------------------------------- Ask the inbox ------------------------------- */
const isOpen = (t) => !t.archived && !t.completed;
const isWaiting = (t) => isOpen(t) && t.messages[t.messages.length - 1].direction === 'out';

function askHeuristic(question, threads, ctx, focus) {
  const q = question.toLowerCase();
  const clientFirst = firstName(ctx.client?.name || 'the client');
  const list = (arr) => arr.slice(0, 8).map((t) => String(t._id));

  if (focus && /\b(why|reason)\b/.test(q)) {
    const who = { assistant: 'you (the assistant)', client: clientFirst, none: 'no one' }[focus.responsibility];
    return { answer: `**“${focus.subject}”** is assigned to ${who}.\n\n${focus.ai?.reason || ''}${focus.responsibilitySource !== 'ai' ? `\n\nNote: this was manually set by the ${focus.responsibilitySource}.` : ''}`, threadIds: [String(focus._id)] };
  }
  if (focus && /\b(summar|tl;?dr|what.*(about|happen))/.test(q)) {
    const pts = focus.ai?.keyPoints?.length ? '\n\n' + focus.ai.keyPoints.map((p) => `• ${p}`).join('\n') : '';
    return { answer: `${focus.ai?.summary || 'No summary yet.'}${pts}`, threadIds: [String(focus._id)] };
  }
  if (/\b(draft|write|reply to|respond to)\b/.test(q)) {
    return focus
      ? { answer: `I've drafted a reply to **“${focus.subject}”** — review it in the composer before sending.`, threadIds: [String(focus._id)], action: 'draft' }
      : { answer: 'Open a conversation first, then ask me to draft a reply to it.', threadIds: [] };
  }
  if (/waiting|pending|haven.?t (heard|replied)|follow.?up/.test(q)) {
    const w = threads.filter(isWaiting);
    return { answer: w.length ? `You're waiting on **${w.length}** ${w.length === 1 ? 'reply' : 'replies'}:` : 'Nothing is waiting on a reply right now.', threadIds: list(w) };
  }
  if (/client|\bher\b|\bhis\b|ceo|boss/.test(q) && /attention|reply|respond|need|require/.test(q)) {
    const c = threads.filter((t) => isOpen(t) && t.responsibility === 'client' && !t.clientStatus);
    return { answer: c.length ? `**${c.length}** ${c.length === 1 ? 'email needs' : 'emails need'} ${clientFirst}'s personal reply:` : `Nothing needs ${clientFirst}'s attention right now. 🎉`, threadIds: list(c) };
  }
  if (/meeting|appointment|calendar|schedule|upcoming|this week|deadline/.test(q)) {
    const m = threads
      .filter((t) => isOpen(t) && t.ai?.dates?.some((d) => new Date(d.date) > new Date()))
      .sort((a, b) => new Date(a.ai.dates[0].date) - new Date(b.ai.dates[0].date));
    return { answer: m.length ? `Upcoming dates I found in the inbox:\n${m.slice(0, 6).map((t) => `• ${t.ai.dates[0].label} — ${new Date(t.ai.dates[0].date).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}`).join('\n')}` : 'No upcoming meetings or deadlines found.', threadIds: list(m) };
  }
  if (/review|unsure|not sure|flag/.test(q)) {
    const r = threads.filter((t) => isOpen(t) && t.ai?.needsReview && t.responsibilitySource === 'ai');
    return { answer: r.length ? `**${r.length}** ${r.length === 1 ? 'conversation is' : 'conversations are'} flagged for your review:` : 'Nothing is flagged for review.', threadIds: list(r) };
  }
  if (/attention|my plate|to ?do|what should i|need(s)? me|priorit|urgent|important/.test(q)) {
    const a = threads
      .filter((t) => isOpen(t) && (t.responsibility === 'assistant' || (t.ai?.needsReview && t.responsibilitySource === 'ai')))
      .sort((x, y) => (y.ai?.priority === 'high') - (x.ai?.priority === 'high'));
    return { answer: a.length ? `**${a.length}** ${a.length === 1 ? 'conversation needs' : 'conversations need'} you — highest priority first:` : "You're all caught up!", threadIds: list(a) };
  }
  // keyword search fallback
  const words = q.replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 3 && !['what', 'which', 'show', 'emails', 'email', 'about', 'from', 'there', 'have', 'with'].includes(w));
  const hits = threads.filter((t) => words.some((w) => `${t.subject} ${t.messages.map((m) => `${m.from.name} ${m.body}`).join(' ')}`.toLowerCase().includes(w)));
  return {
    answer: hits.length ? `I found **${hits.length}** related ${hits.length === 1 ? 'conversation' : 'conversations'}:` : "I couldn't find anything matching that. Try asking about meetings, emails waiting on a reply, or what needs the client's attention.",
    threadIds: list(hits),
  };
}

export async function askInbox(question, threads, ctx, focus) {
  if (aiProvider !== 'heuristic') {
    try {
      const index = threads.slice(0, 80).map((t) => ({
        id: String(t._id),
        subject: t.subject,
        from: t.messages.find((m) => m.direction === 'in')?.from?.name,
        last: fmt(t.lastMessageAt),
        replyOwner: t.responsibility,
        setBy: t.responsibilitySource,
        needsReview: t.ai?.needsReview,
        waiting: isWaiting(t),
        status: t.archived ? 'archived' : t.completed ? 'done' : t.clientStatus ? `client:${t.clientStatus}` : 'open',
        categories: t.ai?.categories,
        summary: t.ai?.summary,
        dates: t.ai?.dates?.map((d) => `${d.label} @ ${fmt(d.date)}`),
      }));
      const text = await callLLM({
        system: `You are Relay's inbox copilot for a personal assistant (${ctx.assistant.name}) who manages ${ctx.client?.name}'s email. Answer questions using ONLY the inbox data provided. Be brief and specific (<=90 words, you may use "•" bullets and **bold**). Refer to conversations by subject. Respond with ONLY JSON: {"answer":"...","threadIds":["ids of relevant conversations, most relevant first, max 8"],"action":"draft" only if the user asked you to draft/write a reply to the focused conversation, else omit}`,
        user: `Today: ${fmt(new Date())}\n${focus ? `Currently open conversation:\nSubject: ${focus.subject}\nAssigned to: ${focus.responsibility} (set by ${focus.responsibilitySource})\nAI reason: ${focus.ai?.reason}\n${threadTranscript(focus, 5)}\n\n` : ''}Inbox (JSON):\n${JSON.stringify(index)}\n\nQuestion: ${question}`,
        maxTokens: 700,
      });
      const out = parseJsonLoose(text);
      const valid = new Set(threads.map((t) => String(t._id)));
      return {
        answer: String(out.answer || ''),
        threadIds: (out.threadIds || []).filter((id) => valid.has(id)).slice(0, 8),
        action: out.action === 'draft' && focus ? 'draft' : undefined,
        engine: engineName(),
      };
    } catch (err) {
      console.warn('[ai] ask fell back to rules:', err.message);
    }
  }
  return { ...askHeuristic(question, threads, ctx, focus), engine: 'rules' };
}
