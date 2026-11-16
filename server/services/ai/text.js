// Small text helpers shared by the AI engines.

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export const firstName = (name = '') => name.trim().split(/\s+/)[0] || name;

export function stripQuoted(body = '') {
  // drop quoted history ("On ... wrote:" / lines starting with >)
  const cut = body.split(/\n(?:On .+wrote:|-{2,}\s*Original Message)/i)[0];
  return cut.split('\n').filter((l) => !l.trim().startsWith('>')).join('\n').trim();
}

export function sentences(text = '') {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const GREETING = /^(hi|hello|hey|dear|good (morning|afternoon|evening))\b[^,.!]*[,.!]?\s*/i;
const SIGNOFF = /\b(best|thanks|thank you|regards|cheers|warmly|sincerely)[,!.]?\s*(\n|$)[\s\S]*$/i;

export function coreText(body = '') {
  return stripQuoted(body).replace(GREETING, '').replace(/^[A-Z][\w'.-]*( [A-Z][\w'.-]*)?[,!]\s*\n/, '').replace(SIGNOFF, '').trim();
}

export function truncate(s = '', n = 220) {
  if (s.length <= n) return s;
  return s.slice(0, n).replace(/\s+\S*$/, '') + '…';
}

/**
 * Extract dates like "Thursday, 20 Nov at 3:00 PM", "20 Nov", "tomorrow at 9:30 AM".
 * Resolved relative to the message date.
 */
export function extractDates(text = '', ref = new Date()) {
  const out = [];
  const re = /\b(?:(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b,?\s*)?(?:(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?)?(?:\s*(?:at|,|from)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm))?/gi;
  let m;
  while ((m = re.exec(text))) {
    if (m[0].trim().length < 3) { re.lastIndex++; continue; }
    const [raw, word, day, mon, hh, mm, ap] = m;
    if (!word && !day) continue;
    let d = new Date(ref);
    d.setSeconds(0, 0);
    if (day && mon) {
      d = new Date(ref.getFullYear(), MONTHS.indexOf(mon.toLowerCase().slice(0, 3)), Number(day), 9, 0);
      if (d < new Date(ref.getTime() - 60 * 864e5)) d.setFullYear(d.getFullYear() + 1);
    } else if (word) {
      const w = word.toLowerCase();
      if (w === 'tomorrow') d.setDate(d.getDate() + 1);
      else if (w !== 'today') {
        const target = WEEKDAYS.indexOf(w);
        let diff = (target - d.getDay() + 7) % 7;
        if (diff === 0) diff = 7;
        d.setDate(d.getDate() + diff);
      }
      d.setHours(9, 0);
    }
    if (hh) {
      let h = Number(hh) % 12;
      if (ap.toLowerCase() === 'pm') h += 12;
      d.setHours(h, Number(mm || 0));
    }
    const before = text.slice(Math.max(0, m.index - 70), m.index).toLowerCase();
    const around = text.slice(Math.max(0, m.index - 90), m.index + raw.length + 40).toLowerCase();
    const kind = /(\bby|before|deadline( is)?|due|until|no later than|expir\w*)\s*(on\s*)?$/.test(before.trim())
      ? 'deadline'
      : /\b(meet\w*|review|appointment|call|dinner|lunch|coffee|offsite|panel|session|slot|reservation|invite|catch up)\b/.test(around)
        ? 'meeting'
        : 'event';
    out.push({ raw: raw.trim().replace(/[.,]+$/, ''), date: d, kind, hasTime: Boolean(hh), specificity: (day ? 2 : 0) + (hh ? 1 : 0) });
  }
  // de-dupe by timestamp
  const seen = new Set();
  const uniq = out.filter((x) => (seen.has(+x.date) ? false : (seen.add(+x.date), true)));
  // prefer explicit dates ("Friday, 20 Nov at 3 PM") over a bare weekday mentioned in passing
  const best = Math.max(0, ...uniq.map((x) => x.specificity));
  return uniq.filter((x) => x.specificity >= Math.min(best, 2)).sort((a, b) => b.specificity - a.specificity || a.date - b.date);
}

export function parseJsonLoose(text = '') {
  const s = text.indexOf('{');
  const e = text.lastIndexOf('}');
  if (s === -1 || e === -1) throw new Error('No JSON object in model output');
  return JSON.parse(text.slice(s, e + 1));
}
