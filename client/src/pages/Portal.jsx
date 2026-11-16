import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, CircleCheck, Hand, Lightbulb, RotateCcw, Sparkles } from 'lucide-react';
import { api } from '../lib/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { firstName, fullDate, greeting, timeAgo, whenLabel } from '../lib/format.js';
import { Avatar, Button, ErrorState, Skeleton, Spinner } from '../components/ui.jsx';

/** The client's view. Deliberately minimal: only what needs them, and two actions. */
export default function Portal() {
  const { token } = useParams();
  const q = useQuery({ queryKey: ['portal', token], queryFn: () => api(`/portal/${token}`, { auth: false }), refetchInterval: 20000 });

  if (q.isError) return <div className="portal"><div className="portal__wrap"><ErrorState error={q.error} onRetry={q.error.status === 404 ? null : q.refetch} /></div></div>;
  const d = q.data;
  const assistant = firstName(d?.assistant?.name || 'your assistant');

  return (
    <div className="portal">
      <div className="portal__wrap">
        <div className="portal__top">
          <span className="portal__brand">
            <svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" fill="#4F46E5" /><path d="M9 11.5h9.5a4 4 0 0 1 0 8H14l-3.5 3v-3H9z" fill="#fff" /><circle cx="22.5" cy="10" r="3" fill="#FBBF24" /></svg>
            Relay · prepared by {d ? d.assistant.name : '…'}
          </span>
          {d && <Avatar name={d.client.name} size="sm" />}
        </div>

        {!d ? (
          <>
            <Skeleton w="70%" h={30} /><Skeleton w="50%" h={16} style={{ marginTop: 12 }} />
            <Skeleton h={190} style={{ marginTop: 28, borderRadius: 18 }} /><Skeleton h={190} style={{ marginTop: 14, borderRadius: 18 }} />
          </>
        ) : (
          <>
            <h1>{greeting()}, {firstName(d.client.name)}.</h1>
            <p className="portal__lead">
              {d.pending.length
                ? <>{d.pending.length === 1 ? 'One email needs' : `${d.pending.length} emails need`} your personal reply. {assistant} is handling everything else.</>
                : <>Nothing needs you right now. {assistant} is handling everything else.</>}
            </p>

            {d.pending.length ? (
              <div className="portal__list">
                {d.pending.map((item) => <PortalCard key={item.id} item={item} token={token} assistant={assistant} />)}
              </div>
            ) : (
              <div className="portal__done">
                <div className="state__icon"><CircleCheck /></div>
                <h2 style={{ fontSize: 20, fontWeight: 700 }}>You’re all clear</h2>
                <p className="muted mt-8">We’ll only bring you emails that genuinely need you.</p>
              </div>
            )}

            {d.recent.length > 0 && <Recent items={d.recent} token={token} assistant={assistant} />}
          </>
        )}
      </div>
    </div>
  );
}

function PortalCard({ item, token, assistant }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [handing, setHanding] = useState(false);
  const [note, setNote] = useState('');
  const [leaving, setLeaving] = useState(false);

  const thread = useQuery({ queryKey: ['portal-thread', item.id], queryFn: () => api(`/portal/${token}/threads/${item.id}`, { auth: false }), enabled: open });
  const act = useMutation({
    mutationFn: ({ action, note: n }) => api(`/portal/${token}/threads/${item.id}/${action}`, { method: 'POST', body: { note: n }, auth: false }),
    onMutate: () => setLeaving(true),
    onSuccess: (_d, { action }) => {
      toast(action === 'handled' ? `Marked as handled. ${assistant} has been updated.` : `Handed to ${assistant}.`);
      setTimeout(() => qc.invalidateQueries({ queryKey: ['portal', token] }), 250);
    },
    onError: (e) => { setLeaving(false); toast(e.message, { type: 'error' }); },
  });
  const nextDate = item.dates?.find((x) => new Date(x.date) > new Date());

  return (
    <article className={`pcard ${leaving ? 'leaving' : ''}`}>
      <div className="pcard__top">
        <Avatar name={item.from?.name} />
        <div className="pcard__from grow"><b>{item.from?.name}</b><span>{timeAgo(item.lastMessageAt)}{item.priority === 'high' ? ' · High priority' : ''}{nextDate ? ` · ${nextDate.kind === 'deadline' ? 'Due' : 'On'} ${whenLabel(nextDate.date)}` : ''}</span></div>
      </div>
      <h2 className="pcard__subject">{item.subject}</h2>
      <p className="pcard__summary">{item.summary}</p>
      {item.why && <div className="pcard__why"><Lightbulb /><span><b>Why you:</b> {item.why}</span></div>}

      {open && (
        <div className="pcard__thread">
          {thread.isPending ? <Spinner /> : thread.data?.messages.map((m) => (
            <div className="pmsg" key={m.id}><b>{m.from.name}</b><time>{fullDate(m.date)}</time><p>{m.body}</p></div>
          ))}
        </div>
      )}

      {handing ? (
        <div className="handover">
          <textarea className="textarea" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={`Anything ${assistant} should know? e.g. “Say yes, but push to next week”`} autoFocus aria-label={`Note for ${assistant}`} />
          <div className="row">
            <Button variant="ghost" onClick={() => setHanding(false)}>Cancel</Button>
            <Button variant="primary" className="grow" loading={act.isPending} onClick={() => act.mutate({ action: 'handover', note })}><Hand /> Hand to {assistant}</Button>
          </div>
        </div>
      ) : (
        <div className="pcard__actions">
          <Button variant="primary" loading={act.isPending} onClick={() => act.mutate({ action: 'handled' })}><CircleCheck /> I’ve handled it</Button>
          <Button onClick={() => setHanding(true)}><Hand /> {assistant}, please handle</Button>
        </div>
      )}
      <button className="linkish mt-12" onClick={() => setOpen((o) => !o)}>
        {open ? <><ChevronUp size={13} style={{ verticalAlign: -2 }} /> Hide email</> : <><ChevronDown size={13} style={{ verticalAlign: -2 }} /> Read the original email{item.messageCount > 1 ? ` (${item.messageCount} messages)` : ''}</>}
      </button>
    </article>
  );
}

function Recent({ items, token, assistant }) {
  const qc = useQueryClient();
  const undo = useMutation({
    mutationFn: (id) => api(`/portal/${token}/threads/${id}/undo`, { method: 'POST', auth: false }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portal', token] }),
  });
  return (
    <section className="portal__recent">
      <h2>Recently</h2>
      {items.map((t) => (
        <div className="recent-row" key={t.id}>
          {t.clientStatus === 'handled' ? <span className="chip chip--success"><CircleCheck /> Handled</span> : <span className="chip chip--brand"><Sparkles /> With {assistant}</span>}
          <span className="grow truncate">{t.subject}</span>
          {(t.clientStatus === 'handled' || (t.clientStatus === 'handover' && t.responsibility === 'assistant')) && (
            <button className="linkish" onClick={() => undo.mutate(t.id)} disabled={undo.isPending}><RotateCcw size={12} style={{ verticalAlign: -2 }} /> Undo</button>
          )}
        </div>
      ))}
    </section>
  );
}
