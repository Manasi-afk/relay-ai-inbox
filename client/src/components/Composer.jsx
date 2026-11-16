import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { PenLine, Send, ShieldCheck, Sparkles, Trash2, Wand2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Button, Modal, Spinner } from './ui.jsx';

const TONES = [['professional', 'Professional'], ['friendly', 'Friendly'], ['concise', 'Concise']];

/**
 * Reply composer. AI drafts are never sent automatically:
 * the assistant edits, then explicitly reviews and approves before sending.
 */
export default function Composer({ thread: t, onUpdate, clientName }) {
  const { me } = useAuth();
  const toast = useToast();
  const [body, setBody] = useState(t.draft?.body || '');
  const [tone, setTone] = useState(t.draft?.tone || 'professional');
  const [instructions, setInstructions] = useState('');
  const [manual, setManual] = useState(false);
  const [forceOpen, setForceOpen] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const mailbox = me.mailboxes.find((m) => m._id === t.mailbox);
  const lastInbound = [...t.messages].reverse().find((m) => m.direction === 'in');

  // keep in sync when a draft is created elsewhere (e.g. from Ask Relay)
  useEffect(() => { setBody(t.draft?.body || ''); }, [t.draft?.body]);

  const draft = useMutation({
    mutationFn: () => api(`/threads/${t.id}/draft`, { method: 'POST', body: { tone, instructions } }),
    onSuccess: (d) => { onUpdate(d); setBody(d.draft?.body || ''); setInstructions(''); },
    onError: (e) => toast(e.message, { type: 'error' }),
  });
  const save = useMutation({
    mutationFn: (b) => api(`/threads/${t.id}/draft`, { method: 'PUT', body: { body: b } }),
    onSuccess: onUpdate,
  });
  const send = useMutation({
    mutationFn: () => api(`/threads/${t.id}/send`, { method: 'POST', body: { body } }),
    onSuccess: (d) => {
      onUpdate(d);
      setReviewing(false);
      setBody('');
      setManual(false);
      setForceOpen(false);
      toast(d.waiting ? 'Reply sent · now tracking it in Waiting for Response' : 'Reply sent');
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  });

  const hasText = body.trim().length > 0;
  const isAiDraft = Boolean(t.draft?.generatedBy) && hasText;
  const showEditor = hasText || manual;

  // Collapsed states for conversations the assistant shouldn't normally answer
  if (!showEditor && !forceOpen && !draft.isPending && (t.responsibility !== 'assistant' || t.waiting || t.completed)) {
    const msg = t.completed ? 'This conversation is done.'
      : t.waiting ? 'You replied last, so Relay is waiting on the other side.'
      : t.responsibility === 'client' ? `${clientName} should reply personally.`
      : 'No reply needed for this one.';
    return (
      <div className="composer">
        <div className="composer__empty" style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="muted grow">{msg}</span>
          <Button size="sm" onClick={() => setForceOpen(true)}><PenLine /> Reply anyway</Button>
        </div>
      </div>
    );
  }

  return (
    <section className="composer" aria-label="Reply">
      <div className="composer__head">
        <b>Reply</b>
        <span className="subtle" style={{ fontSize: 12.5 }}>to {lastInbound?.from?.name || t.from?.name} · from {mailbox?.address}</span>
        {showEditor && (
          <div className="composer__tools">
            <select className="select select--sm" style={{ width: 'auto' }} value={tone} onChange={(e) => setTone(e.target.value)} aria-label="Tone">
              {TONES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <Button size="sm" variant="soft" onClick={() => draft.mutate()} loading={draft.isPending}>{!draft.isPending && <Wand2 />} {hasText ? 'Rewrite' : 'Draft with AI'}</Button>
          </div>
        )}
      </div>

      {draft.isPending ? (
        <div className="drafting"><Spinner /> Drafting a {tone} reply from the conversation…</div>
      ) : showEditor ? (
        <>
          <textarea
            className="textarea"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onBlur={() => body !== (t.draft?.body || '') && save.mutate(body)}
            placeholder="Write your reply…"
            aria-label="Reply text"
            autoFocus={manual}
          />
          {isAiDraft && (
            <div className="composer__review"><ShieldCheck /> AI-generated draft. Check names, dates and commitments before sending.</div>
          )}
          <div className="composer__foot">
            <span className="subtle" style={{ fontSize: 12 }}>{save.isPending ? 'Saving…' : t.draft?.updatedAt ? 'Draft saved' : ''}</span>
            <div className="grow" />
            <Button size="sm" variant="ghost" onClick={() => { setBody(''); setManual(false); save.mutate(''); }}><Trash2 /> Discard</Button>
            <Button size="sm" variant="primary" disabled={body.trim().length < 2} onClick={() => setReviewing(true)}><Send /> Review &amp; send</Button>
          </div>
        </>
      ) : (
        <div className="composer__empty">
          <div className="instructions">
            <select className="select" style={{ width: 160, flexShrink: 0 }} value={tone} onChange={(e) => setTone(e.target.value)} aria-label="Tone">
              {TONES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <input className="input" value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Optional: add guidance, e.g. “accept the Thursday slot”" aria-label="Instructions for the AI" onKeyDown={(e) => e.key === 'Enter' && draft.mutate()} />
          </div>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <Button variant="primary" onClick={() => draft.mutate()}><Sparkles /> Draft reply with AI</Button>
            <Button onClick={() => setManual(true)}><PenLine /> Write it myself</Button>
          </div>
        </div>
      )}

      {reviewing && (
        <Modal
          title="Review before sending"
          subtitle="Relay never sends anything without your approval."
          onClose={() => !send.isPending && setReviewing(false)}
          wide
          footer={<>
            <Button variant="ghost" onClick={() => setReviewing(false)} disabled={send.isPending}>Keep editing</Button>
            <Button variant="primary" onClick={() => send.mutate()} loading={send.isPending}>{!send.isPending && <Send />} Approve &amp; send</Button>
          </>}
        >
          <div className="send-meta">
            <span>From</span><b>{me.user.name} · {mailbox?.address}</b>
            <span>To</span><b>{lastInbound?.from?.name} &lt;{lastInbound?.from?.email}&gt;</b>
            <span>Subject</span><b>{t.subject.startsWith('Re:') ? t.subject : `Re: ${t.subject}`}</b>
          </div>
          <div className="send-preview">{body}</div>
          <p className="subtle mt-12" style={{ fontSize: 12 }}>Prototype: sending is simulated. The reply is added to the conversation and the thread moves to “Waiting for Response”.</p>
        </Modal>
      )}
    </section>
  );
}
