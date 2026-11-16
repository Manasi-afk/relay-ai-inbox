import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowUp, CornerDownRight, MessageSquareText, Sparkles, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { firstName, richText, timeAgo } from '../lib/format.js';
import { OwnerChip } from './ui.jsx';
import { useShell } from './AppShell.jsx';

export default function AskPanel({ seed, focusThread, onClose }) {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { clientName } = useShell();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef(null);
  const sentSeed = useRef(false);

  const generic = [
    'Show me emails that need my attention',
    'What am I waiting for a response on?',
    `Which emails require ${clientName}’s attention?`,
    'What meetings and deadlines are coming up?',
  ];
  const contextual = focusThread ? ['Summarize this conversation', `Why has this email been assigned to ${focusThread.responsibility === 'client' ? clientName : focusThread.responsibility === 'assistant' ? 'me' : 'no reply'}?`, 'Draft a reply to this conversation'] : [];

  async function ask(question) {
    if (!question.trim() || busy) return;
    setInput('');
    setMessages((m) => [...m, { role: 'me', text: question }]);
    setBusy(true);
    try {
      const res = await api('/ai/ask', { method: 'POST', body: { question, threadId: focusThread?.id } });
      if (res.action === 'draft' && focusThread) {
        await api(`/threads/${focusThread.id}/draft`, { method: 'POST', body: { tone: 'professional' } });
        qc.invalidateQueries({ queryKey: ['thread', focusThread.id] });
        qc.invalidateQueries({ queryKey: ['threads'] });
      }
      setMessages((m) => [...m, { role: 'ai', ...res }]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'ai', answer: e.message, error: true, threads: [] }]);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (seed && !sentSeed.current) { sentSeed.current = true; ask(seed); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);
  useEffect(() => { bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, busy]);
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <aside className="ask" aria-label="Ask Relay">
      <div className="ask__head">
        <div className="ask__badge"><Sparkles /></div>
        <div className="grow"><b>Ask Relay</b><span>Questions about {clientName}’s inbox</span></div>
        <button className="icon-btn" onClick={onClose} aria-label="Close"><X /></button>
      </div>

      <div className="ask__body" ref={bodyRef}>
        {!messages.length && (
          <div className="ask__intro">
            <h3>What do you need to know?</h3>
            <p>I can find, summarise and explain conversations, and draft replies for you to review.</p>
            <div className="suggestions">
              {[...contextual, ...generic].map((s) => (
                <button key={s} className="suggestion" onClick={() => ask(s)}><MessageSquareText />{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => m.role === 'me' ? (
          <div key={i} className="bubble bubble--me">{m.text}</div>
        ) : (
          <div key={i} className="bubble bubble--ai" style={m.error ? { borderColor: 'var(--danger)' } : undefined}>
            {richText(m.answer).map((line, j) => <p key={j}>{line.map((p, k) => (typeof p === 'string' ? p : <b key={k}>{p.b}</b>))}</p>)}
            {m.threads?.length > 0 && (
              <div className="bubble__threads">
                {m.threads.map((t) => (
                  <button key={t.id} className="bubble__thread" onClick={() => { nav(`/app/inbox/inbox?thread=${t.id}`); if (window.innerWidth < 960) onClose(); }}>
                    <CornerDownRight size={14} color="var(--ink-3)" />
                    <div className="grow"><b className="truncate" style={{ display: 'block' }}>{t.subject}</b><span className="subtle">{firstName(t.from?.name)} · {timeAgo(t.lastMessageAt)}</span></div>
                    <OwnerChip thread={t} compact />
                  </button>
                ))}
              </div>
            )}
            {m.engine && <div className="bubble__engine">{m.engine === 'rules' ? 'Answered by built-in rules engine' : `Answered by ${m.engine}`}</div>}
          </div>
        ))}
        {busy && <div className="bubble bubble--ai"><span className="typing"><i /><i /><i /></span></div>}
        {messages.length > 0 && !busy && (
          <div className="suggestions" style={{ marginTop: 0 }}>
            {[...contextual, ...generic].filter((s) => !messages.some((m) => m.text === s)).slice(0, 2).map((s) => (
              <button key={s} className="suggestion" onClick={() => ask(s)}><MessageSquareText />{s}</button>
            ))}
          </div>
        )}
      </div>

      {focusThread && <div className="ask__context"><CornerDownRight /> <span className="truncate">Looking at “{focusThread.subject}”</span></div>}
      <form className="ask__form" onSubmit={(e) => { e.preventDefault(); ask(input); }}>
        <input className="input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask anything about the inbox…" autoFocus aria-label="Your question" />
        <button className="btn btn--primary" style={{ width: 44, height: 44, padding: 0 }} disabled={!input.trim() || busy} aria-label="Send"><ArrowUp /></button>
      </form>
    </aside>
  );
}
