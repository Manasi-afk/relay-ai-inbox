const sameDay = (a, b) => a.toDateString() === b.toDateString();

export function timeAgo(d) {
  const date = new Date(d);
  const now = new Date();
  const mins = Math.round((now - date) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (sameDay(date, now)) return date.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' });
  const y = new Date(now); y.setDate(y.getDate() - 1);
  if (sameDay(date, y)) return 'Yesterday';
  if (now - date < 6 * 864e5) return date.toLocaleDateString('en-GB', { weekday: 'short' });
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export const fullDate = (d) =>
  new Date(d).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

export function whenLabel(d) {
  const date = new Date(d);
  const now = new Date();
  const t = new Date(now); t.setDate(t.getDate() + 1);
  const time = date.getHours() === 9 && date.getMinutes() === 0 ? '' : ` · ${date.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' })}`;
  if (sameDay(date, now)) return `Today${time}`;
  if (sameDay(date, t)) return `Tomorrow${time}`;
  return `${date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}${time}`;
}

export const firstName = (n = '') => n.trim().split(/\s+/)[0] || n;
export const initials = (n = '') => n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';

export function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

/** Render **bold** and line breaks from AI answers safely. */
export function richText(text = '') {
  return text.split('\n').map((line) => line.split(/(\*\*[^*]+\*\*)/g).map((p) => (p.startsWith('**') ? { b: p.slice(2, -2) } : p)));
}
