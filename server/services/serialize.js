import { truncate, stripQuoted } from './ai/text.js';

export const isWaiting = (t) => !t.archived && !t.completed && t.messages[t.messages.length - 1]?.direction === 'out';

export function threadListItem(t) {
  const last = t.messages[t.messages.length - 1];
  const firstInbound = t.messages.find((m) => m.direction === 'in');
  const counterpart = firstInbound?.from || last?.to?.[0] || last?.from;
  return {
    id: String(t._id),
    mailbox: String(t.mailbox),
    subject: t.subject,
    from: counterpart,
    lastFrom: last?.from,
    lastDirection: last?.direction,
    snippet: truncate(stripQuoted(last?.body || '').replace(/\s+/g, ' '), 160),
    lastMessageAt: t.lastMessageAt,
    messageCount: t.messages.length,
    unread: t.unread,
    starred: t.starred,
    archived: t.archived,
    completed: t.completed,
    waiting: isWaiting(t),
    responsibility: t.responsibility,
    responsibilitySource: t.responsibilitySource,
    classifying: t.classifying,
    clientStatus: t.clientStatus,
    clientNote: t.clientNote,
    clientActedAt: t.clientActedAt,
    hasDraft: Boolean(t.draft?.body),
    ai: t.ai
      ? {
          summary: t.ai.summary,
          reason: t.ai.reason,
          clientReason: t.ai.clientReason,
          confidence: t.ai.confidence,
          needsReview: t.ai.needsReview,
          categories: t.ai.categories,
          priority: t.ai.priority,
          dates: t.ai.dates,
          keyPoints: t.ai.keyPoints,
          engine: t.ai.engine,
          classifiedAt: t.ai.classifiedAt,
          suggested: t.ai.responsibility,
        }
      : null,
  };
}

export function threadDetail(t) {
  return {
    ...threadListItem(t),
    messages: t.messages.map((m) => ({
      id: String(m._id), from: m.from, to: m.to, date: m.date, body: m.body, direction: m.direction, sentBy: m.sentBy,
    })),
    draft: t.draft?.body ? t.draft : null,
  };
}
