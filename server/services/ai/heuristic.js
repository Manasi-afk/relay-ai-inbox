/**
 * Rule-based fallback for the AI engine.
 * Used when no LLM key is configured (or the LLM call fails) so the prototype
 * always works. It returns exactly the same shape as the LLM engine.
 */
import { coreText, extractDates, firstName, sentences, truncate } from './text.js';

const AUTOMATED_SENDER = /(no-?reply|do-?not-?reply|notifications?|mailer|alerts?|receipts?|digest|newsletter|updates?)@/i;
const AUTOMATED_TEXT = /(unsubscribe|this is an automated|automated message|do not reply to this|manage (your )?preferences|view in browser)/i;
const RESOLVED = /(no (further )?action (is )?(needed|required)|all sorted|(is|been) resolved|fixed now|never ?mind|no need to (reply|respond)|all set now|consider (this|it) closed)/i;

// [pattern, weight, human explanation shown to the assistant/client]
const CLIENT_CUES_RAW = [
  [/\b(your|her|__C__'?s?) (personal )?(approval|sign-?off|decision|call|go-?ahead)\b/i, 3, 'asks for a personal approval or decision', 'they need your personal approval or decision'],
  [/\bneeds? (her|your|__C__'?s?) (personal )?(confirmation|input|approval|answer)\b/i, 3, 'explicitly needs the client’s own confirmation', 'they’ve asked for your own confirmation'],
  [/\b(confidential|strictly private|personal(ly)?)\b/i, 2, 'is marked personal or confidential', 'it’s marked personal or confidential'],
  [/\b(term sheet|valuation|offer letter|counter-?offer|compensation|equity|board (deck|meeting)|liability cap|indemnity|commercial call)\b/i, 2.5, 'involves a sensitive business decision', 'it involves a sensitive call only you can make'],
  [/\b(on the record|quote from|interview with|comment from)\b/i, 2.5, 'requests a statement in the client’s own voice', 'they want a statement in your own voice'],
  [/\b(approve|sign off|decide|your thoughts|your view|her view|which (one )?do you prefer|your call|can you make it|would you (personally )?like to)\b/i, 2, 'asks for the client’s opinion or choice', 'they’re asking for your opinion or choice'],
  [/\b(didi|mom|dad|family|birthday|anniversary|wife|husband|my kids?)\b/i, 1.5, 'is a personal or family matter', 'it’s a personal or family matter'],
];

const ASSISTANT_CUES_RAW = [
  [/\b(reschedul\w*|move (the|our)\b.{0,30}\b(meeting|review|call)|availability|works for (her|__C__'?s?|your) calendar|time slot|send (an|the) invite)\b/i, 3, 'scheduling or rescheduling'],
  [/\b(appointment|booking|reservation|confirm (the |your )?(booking|appointment|attendance|slot)|reply yes to confirm)\b/i, 2.5, 'confirming a booking or appointment'],
  [/\b(invoice|po number|purchase order|receipt|payment (link|details)|fees? (due|reminder)|renewal)\b/i, 2.5, 'routine billing or administration'],
  [/\b(kyc|documents?|paperwork|forms?|logo files?|latest (numbers|figures|mau)|send (over|across))\b/i, 2, 'sending documents or information on file'],
  [/\b(bio|headshot|press kit|photos?)\b/i, 1.5, 'sharing standard materials (bio, photos)'],
  [/\b(follow(ing)?[- ]up|gentle reminder|checking in on|pending request)\b/i, 1.5, 'following up on a pending request'],
  [/\b(venue|offsite|travel|flight|hotel|logistics)\b/i, 1.5, 'logistics the assistant usually handles'],
];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const withClient = (cues, first) =>
  cues.map(([re, w, why, you]) => [new RegExp(re.source.replaceAll('__C__', escapeRe(first.toLowerCase())), re.flags), w, why, you]);

const MEETING = /\b(meet(ing)?|(a|the|follow-up|quick) call|appointment|quarterly review|dinner|lunch|coffee|offsite|panel|session|catch up|reschedul\w*|booking|reservation|slot)\b/i;
const URGENT = /\b(urgent|asap|today|end of day|eod|time-?sensitive|deadline|by (today|tomorrow)|immediately)\b/i;

const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);

function score(text, cues) {
  let total = 0;
  const hits = [];
  for (const [re, w, why, you] of cues) {
    const m = text.match(re);
    if (m) {
      total += w;
      hits.push({ why, you: you || why, phrase: m[0] });
    }
  }
  return { total, hits };
}

function summarize(thread, inbound) {
  const msgs = thread.messages;
  const base = inbound ? coreText(inbound.body) : coreText(msgs[msgs.length - 1].body);
  const s = sentences(base);
  let summary = truncate(s.slice(0, 2).join(' '), 230);
  if (msgs.length > 2) summary = `${msgs.length}-message thread. ${summary}`;
  const keyPoints = s
    .filter((x) => /\?|\d|please|need|by |deadline|confirm|approve/i.test(x))
    .slice(0, 3)
    .map((x) => truncate(x, 140));
  return { summary, keyPoints };
}

export function classifyHeuristic(thread, ctx) {
  const msgs = thread.messages;
  const last = msgs[msgs.length - 1];
  const lastInbound = [...msgs].reverse().find((m) => m.direction === 'in');
  const clientFirst = firstName(ctx.client.name);
  const text = `${thread.subject}\n${coreText(lastInbound?.body || last.body)}`;
  const historyText = msgs.map((m) => m.body).join('\n');

  const dates = extractDates(text, new Date(last.date))
    .filter((d) => d.date > new Date(Date.now() - 864e5))
    .slice(0, 3)
    .map((d) => ({
      label: `${d.kind === 'meeting' ? 'Meeting' : d.kind === 'deadline' ? 'Deadline' : 'Date'}: ${d.raw}`,
      date: d.date,
      kind: d.kind,
    }));

  const { summary, keyPoints } = summarize(thread, lastInbound);
  const res = {
    responsibility: 'none',
    confidence: 0.7,
    needsReview: false,
    reason: '',
    clientReason: '',
    summary,
    keyPoints,
    categories: [],
    dates,
    priority: 'normal',
  };

  const sender = lastInbound?.from?.email || '';
  const isAutomated = AUTOMATED_SENDER.test(sender) || AUTOMATED_TEXT.test(historyText);

  if (last.direction === 'out') {
    res.responsibility = 'none';
    res.confidence = 0.9;
    res.categories = ['waiting'];
    const who = msgs.find((m) => m.direction === 'in')?.from?.name || 'the other party';
    res.reason = `The latest message was sent from ${clientFirst}'s mailbox, so the ball is in ${firstName(who)}'s court — tracking it as Waiting for Response.`;
  } else if (isAutomated) {
    res.responsibility = 'none';
    res.confidence = 0.93;
    res.priority = 'low';
    res.categories = dates.length && /reservation|booking|appointment/i.test(text) ? ['meeting', 'general'] : ['general'];
    res.reason = 'Automated notification, receipt or newsletter — no human is waiting for a reply.';
  } else if (RESOLVED.test(coreText(last.body))) {
    res.responsibility = 'none';
    res.confidence = 0.86;
    res.categories = ['general'];
    res.reason = 'The latest message says the matter is resolved, so no reply is needed.';
  } else {
    const c = score(text, withClient(CLIENT_CUES_RAW, clientFirst));
    const a = score(text, withClient(ASSISTANT_CUES_RAW, clientFirst));
    const hasQuestion = /\?/.test(text) || /\b(please|could you|can you|let (me|us) know)\b/i.test(text);

    if (c.total >= 3 && a.total >= 3 && Math.min(c.total, a.total) / Math.max(c.total, a.total) >= 0.45) {
      res.responsibility = c.total >= a.total ? 'client' : 'assistant';
      res.needsReview = true;
      res.confidence = 0.52;
      res.reason = `Mixed signals: part of this is ${a.hits[0].why} (assistant), but it also ${c.hits[0].why} (client). Flagged so you can decide who owns the reply.`;
      res.clientReason = cap(`${c.hits[0].you}.`);
    } else if (c.total >= 2.5 && c.total >= a.total) {
      res.responsibility = 'client';
      res.confidence = Math.min(0.96, 0.66 + (c.total - a.total) * 0.05);
      const quote = c.hits[0].phrase;
      res.reason = `This ${c.hits.map((h) => h.why).slice(0, 2).join(' and ')} (“${quote}”) — something only ${clientFirst} can answer.`;
      res.clientReason = cap(`${c.hits[0].you}${c.hits[1] ? `, and ${c.hits[1].you}` : ''}.`);
    } else if (a.total >= 1.5) {
      res.responsibility = 'assistant';
      res.confidence = Math.min(0.95, 0.64 + (a.total - c.total) * 0.05);
      res.reason = `Routine request — ${a.hits.map((h) => h.why).slice(0, 2).join(' and ')} (“${a.hits[0].phrase}”). The assistant can reply on ${clientFirst}'s behalf.`;
    } else if (hasQuestion) {
      res.responsibility = 'assistant';
      res.confidence = 0.45;
      res.needsReview = true;
      res.reason = 'The sender is expecting a reply, but it is unclear who should own it. Flagged for assistant review.';
    } else {
      res.responsibility = 'none';
      res.confidence = 0.72;
      res.categories = ['general'];
      res.reason = 'Informational update with no question or request — no reply needed.';
    }

    if (res.responsibility !== 'none') res.categories.push('action');
    if (MEETING.test(text) && (dates.some((d) => d.kind === 'meeting') || /reschedul|availability|invite/i.test(text))) res.categories.push('meeting');
    if (res.responsibility === 'client' || URGENT.test(text) || /confidential|board|legal|contract/i.test(text)) {
      res.categories.push('important');
      const soon = dates.some((d) => d.kind === 'deadline' && new Date(d.date) - Date.now() < 2 * 864e5);
      res.priority = URGENT.test(text) || soon ? 'high' : 'normal';
    }
  }

  if (res.confidence < 0.6) res.needsReview = true;
  res.categories = [...new Set(res.categories)];
  if (!res.categories.length) res.categories = ['general'];
  return res;
}

/* -------------------------------- Drafting -------------------------------- */
export function draftHeuristic(thread, ctx, { tone = 'professional', instructions = '' } = {}) {
  const lastInbound = [...thread.messages].reverse().find((m) => m.direction === 'in');
  const to = firstName(lastInbound?.from?.name || 'there');
  const clientFirst = firstName(ctx.client.name);
  const text = `${thread.subject} ${lastInbound?.body || ''}`;
  const date = thread.ai?.dates?.[0];
  const when = date
    ? new Date(date.date).toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
    : null;

  const opener = tone === 'friendly' ? `Hi ${to},\n\nThanks so much for reaching out!` : tone === 'concise' ? `Hi ${to},` : `Dear ${to},\n\nThank you for your email.`;
  let body;
  if (/reschedul|availability|move/i.test(text)) {
    body = `${when ? `${when} works well for ${clientFirst}` : `${clientFirst} is available at the proposed time`} — I've updated the calendar and will send across a revised invite shortly.`;
  } else if (/appointment|booking|confirm/i.test(text)) {
    body = `I'm writing on behalf of ${clientFirst} to confirm${when ? ` the appointment on ${when}` : ' the booking'}. Please let me know if you need anything further from our side.`;
  } else if (/invoice|po number|payment|fees/i.test(text)) {
    body = `I'm looking into this on ${clientFirst}'s behalf and will share the required details (including the PO reference) by end of day.`;
  } else if (/documents?|kyc|files?|numbers/i.test(text)) {
    body = `Thanks for following up. I'll send the requested documents over shortly and will confirm once they're on their way.`;
  } else if (thread.responsibility === 'client') {
    body = `${clientFirst} has received your note and will come back to you personally. I'll make sure it's prioritised.`;
  } else {
    body = `I'm handling this on ${clientFirst}'s behalf and will get back to you with an update shortly.`;
  }
  if (instructions) body += `\n\n${instructions.trim().replace(/^./, (c) => c.toUpperCase())}${/[.!?]$/.test(instructions.trim()) ? '' : '.'}`;
  const close = tone === 'concise' ? 'Thanks,' : tone === 'friendly' ? 'Warm regards,' : 'Kind regards,';
  return `${opener}\n\n${body}\n\n${close}\n${ctx.assistant.name}\nOffice of ${ctx.client.name}`;
}
