import { Bot, CalendarClock, Clock3, Flag, Inbox, Layers, MailCheck, MailMinus, Sparkles, Star, UserRound, UserRoundCheck, Archive, CircleCheck, MailOpen } from 'lucide-react';

export const RESP = {
  assistant: { label: 'Assistant to Reply', short: 'You reply', tone: 'assistant', icon: UserRoundCheck },
  client: { label: 'Client to Reply', short: 'Client replies', tone: 'client', icon: UserRound },
  none: { label: 'No Reply Needed', short: 'No reply', tone: 'none', icon: MailMinus },
};

export const SEGMENTS = [
  { key: 'inbox', label: 'All open', icon: Inbox, group: 'main' },
  { key: 'review', label: 'Needs review', icon: Flag, group: 'main', hint: 'AI is unsure who should reply' },
  { key: 'assistant', label: 'Assistant to Reply', icon: UserRoundCheck, group: 'reply', tone: 'assistant' },
  { key: 'client', label: 'Client to Reply', icon: UserRound, group: 'reply', tone: 'client' },
  { key: 'none', label: 'No Reply Needed', icon: MailMinus, group: 'reply', tone: 'none' },
  { key: 'action', label: 'Action Required', icon: Sparkles, group: 'smart' },
  { key: 'waiting', label: 'Waiting for Response', icon: Clock3, group: 'smart' },
  { key: 'meetings', label: 'Meetings', icon: CalendarClock, group: 'smart' },
  { key: 'important', label: 'Important', icon: Star, group: 'smart' },
  { key: 'general', label: 'General', icon: Layers, group: 'smart' },
  { key: 'unread', label: 'Unread', icon: MailOpen, group: 'hidden' },
  { key: 'done', label: 'Done', icon: CircleCheck, group: 'other' },
  { key: 'archived', label: 'Archived', icon: Archive, group: 'other' },
];

export const segmentByKey = Object.fromEntries(SEGMENTS.map((s) => [s.key, s]));

export const EMPTY_COPY = {
  inbox: ['Inbox zero', 'Every open conversation is handled. Enjoy the quiet.'],
  review: ['Nothing to review', 'The AI is confident about every conversation right now.'],
  assistant: ["You're all caught up", 'No emails are waiting on your reply.'],
  client: ['Nothing for your client', 'No emails need their personal reply right now.'],
  none: ['No FYIs', 'Newsletters and notifications will collect here.'],
  action: ['No actions pending', 'Nothing needs follow-up right now.'],
  waiting: ['Not waiting on anyone', 'Conversations you have replied to will show up here.'],
  meetings: ['No scheduling emails', 'Meeting and appointment emails will collect here.'],
  important: ['Nothing urgent', 'High-priority and starred emails will show up here.'],
  general: ['Nothing here', 'Informational emails will collect here.'],
  unread: ['All read', 'You have read every open conversation.'],
  done: ['Nothing completed yet', 'Conversations you mark as done appear here.'],
  archived: ['Archive is empty', 'Archived conversations appear here.'],
};

export { Bot, MailCheck };
