import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Archive, ArchiveRestore, ArrowLeft, Bot, CalendarClock, CircleCheck, Copy, Flag, Hand, MailMinus, MailOpen, RefreshCw,
  RotateCcw, Sparkles, Star, UserRound, UserRoundCheck, CircleAlert,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { RESP } from '../lib/constants.js';
import { firstName, fullDate, timeAgo, whenLabel } from '../lib/format.js';
import { Avatar, Button, ErrorState, Skeleton, Spinner } from './ui.jsx';
import { useShell } from './AppShell.jsx';
import Composer from './Composer.jsx';

export default function ThreadView({ id, onClose, onGone }) {
  const { me } = useAuth();
  const { clientName, setFocusThread, openAsk } = useShell();
  const toast = useToast();
  const qc = useQueryClient();
  const [showAll, setShowAll] = useState(false);
  const [expanded, setExpanded] = useState({});

  const q = useQuery({ queryKey: ['thread', id], queryFn: () => api(`/threads/${id}`), refetchInterval: 20000 });
  const t = q.data;

  useEffect(() => {
    if (t) {
      setFocusThread(t);
      qc.invalidateQueries({ queryKey: ['counts'] });
    }
  }, [t, setFocusThread, qc]);
  useEffect(() => () => setFocusThread(null), [setFocusThread]);
  useEffect(() => { if (q.error?.status === 404) onGone?.(); }, [q.error, onGone]);

  const update = (data) => {
    qc.setQueryData(['thread', id], data);
    qc.invalidateQueries({ queryKey: ['threads'] });
    qc.invalidateQueries({ queryKey: ['counts'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const patch = useMutation({
    mutationFn: (body) => api(`/threads/${id}`, { method: 'PATCH', body }),
    onSuccess: update,
    onError: (e) => toast(e.message, { type: 'error' }),
  });
  const reclassify = useMutation({
    mutationFn: () => api(`/threads/${id}/reclassify`, { method: 'POST' }),
    onSuccess: (d) => { update(d); toast(`AI re-checked this conversation → ${RESP[d.responsibility].label}`, { type: 'ai' }); },
    onError: (e) => toast(e.message, { type: 'error' }),
  });

  if (q.isPending) return <div className="detail"><Skeleton w="60%" h={22} /><Skeleton h={160} style={{ borderRadius: 16 }} /><Skeleton h={120} style={{ borderRadius: 14 }} /></div>;
  if (q.isError) return <div className="detail"><ErrorState error={q.error} onRetry={q.refetch} /></div>;

  const ai = t.ai || {};
  const overridden = t.responsibilitySource !== 'ai' && ai.suggested && ai.suggested !== t.responsibility;
  const confPct = Math.round((ai.confidence || 0) * 100);
  const portalLink = `${window.location.origin}/c/${me.client?.portalToken}`;

  function setOwner(r) {
    if (r === t.responsibility) return;
    const prev = t.responsibility;
    patch.mutate({ responsibility: r }, {
      onSuccess: () => toast(r === 'client' ? `Moved to ${clientName}’s view` : `Marked as ${RESP[r].label}`, {
        action: { label: 'Undo', onClick: () => patch.mutate({ responsibility: prev }) },
      }),
    });
  }
  const act = (body, msg, undo) => patch.mutate(body, { onSuccess: () => msg && toast(msg, undo ? { action: { label: 'Undo', onClick: () => patch.mutate(undo) } } : undefined) });

  const msgs = t.messages;
  const hidden = !showAll && msgs.length > 3 ? msgs.length - 2 : 0;
  const visible = hidden ? [msgs[0], ...msgs.slice(-1)] : msgs;
  const hiddenCount = hidden ? msgs.length - 2 : 0;

  return (
    <article className="detail">
      <div className="detail__bar">
        <button className="icon-btn mobile-only" onClick={onClose} aria-label="Back to list"><ArrowLeft /></button>
        <div className="grow" />
        <button className="icon-btn" title="Ask Relay about this" onClick={() => openAsk()}><Sparkles /></button>
        <button className={`icon-btn ${t.starred ? 'is-on' : ''}`} title={t.starred ? 'Remove from important' : 'Mark important'} onClick={() => act({ starred: !t.starred })}><Star fill={t.starred ? 'currentColor' : 'none'} /></button>
        <button className="icon-btn" title="Mark unread" onClick={() => act({ unread: true }, 'Marked as unread')}><MailOpen /></button>
        {t.archived
          ? <button className="icon-btn" title="Move to inbox" onClick={() => act({ archived: false }, 'Moved back to inbox')}><ArchiveRestore /></button>
          : <button className="icon-btn" title="Archive" onClick={() => act({ archived: true }, 'Conversation archived', { archived: false })}><Archive /></button>}
        {t.completed
          ? <Button size="sm" onClick={() => act({ completed: false }, 'Reopened')}><RotateCcw /> Reopen</Button>
          : <Button size="sm" variant="primary" onClick={() => act({ completed: true }, 'Marked as done', { completed: false })}><CircleCheck /> Done</Button>}
      </div>

      <header>
        <h1 className="detail__subject">{t.subject}</h1>
        <div className="detail__meta">
          <span className="muted">{t.from?.name}</span>
          <span className="subtle">·</span>
          <span className="subtle">{t.messageCount} {t.messageCount === 1 ? 'message' : 'messages'} · last {timeAgo(t.lastMessageAt)}</span>
          {ai.priority === 'high' && <span className="chip chip--high">High priority</span>}
          {t.completed && <span className="chip chip--success"><CircleCheck /> Done</span>}
          {t.archived && <span className="chip chip--neutral"><Archive /> Archived</span>}
        </div>
      </header>

      {/* -------- Client ↔ assistant status -------- */}
      {t.clientStatus === 'handover' && (
        <div className="notice notice--handover"><Hand /><div><b>{clientName} handed this to you</b>{t.clientNote ? <> · “{t.clientNote}”</> : ''}<div className="subtle" style={{ fontSize: 12 }}>{timeAgo(t.clientActedAt)}</div></div></div>
      )}
      {t.clientStatus === 'handled' && (
        <div className="notice notice--handled"><CircleCheck /><div><b>{clientName} handled this personally</b>{t.clientNote ? <> · “{t.clientNote}”</> : ''}<div style={{ fontSize: 12, opacity: .8 }}>{timeAgo(t.clientActedAt)}</div></div></div>
      )}
      {t.responsibility === 'client' && !t.clientStatus && !t.completed && (
        <div className="notice notice--client">
          <UserRound />
          <div><b>Waiting on {clientName}.</b> This is in {clientName}’s client view, along with the summary and why their reply is needed.</div>
          <div className="actions"><Button size="sm" onClick={async () => { try { await navigator.clipboard.writeText(portalLink); toast('Client view link copied'); } catch { toast(portalLink, { type: 'info' }); } }}><Copy /> Copy link</Button></div>
        </div>
      )}
      {ai.needsReview && t.responsibilitySource === 'ai' && !t.completed && (
        <div className="notice notice--review"><Flag /><div><b>AI isn’t sure who should reply.</b> Confirm the owner below and Relay will remember your choice for this conversation.</div></div>
      )}

      {/* -------- AI insight -------- */}
      <section className="ai-card" aria-label="AI analysis">
        <div className="ai-card__head">
          <Sparkles /><b>AI analysis</b>
          <span className="subtle" style={{ fontSize: 12, marginLeft: 'auto' }}>{ai.engine === 'rules' ? 'Rules engine' : ai.engine?.split(':')[0] === 'claude' ? 'Claude' : ai.engine?.split(':')[0] === 'gemini' ? 'Gemini' : 'AI'} · {ai.classifiedAt ? timeAgo(ai.classifiedAt) : ''}</span>
          <button className="icon-btn icon-btn--sm" title="Re-run AI" onClick={() => reclassify.mutate()} disabled={reclassify.isPending}>{reclassify.isPending ? <Spinner size={14} /> : <RefreshCw />}</button>
        </div>
        <div className="ai-card__grid">
          <div>
            <div className="label-sm">Who should reply</div>
            <div className="owner-toggle" role="radiogroup" aria-label="Reply responsibility">
              {[['assistant', UserRoundCheck, 'Assistant'], ['client', UserRound, clientName], ['none', MailMinus, 'No reply']].map(([key, Icon, label]) => (
                <button key={key} title={label} role="radio" aria-checked={t.responsibility === key} className={t.responsibility === key ? `on-${key}` : ''} onClick={() => setOwner(key)} disabled={patch.isPending}>
                  <Icon /> <span>{label}</span>
                </button>
              ))}
            </div>
            <p className="reason">{t.responsibilitySource === 'client' && t.clientStatus === 'handover'
              ? <>{clientName} asked you to handle this one.</>
              : ai.reason}</p>
            <div className="confidence">
              {t.responsibilitySource === 'ai' ? (
                <>
                  <div className={`conf-bar ${confPct < 60 ? 'low' : confPct < 75 ? 'mid' : ''}`}><div style={{ width: `${confPct}%` }} /></div>
                  <span>{confPct}% confident</span>
                </>
              ) : (
                <>
                  <span className="chip chip--neutral">Set by {t.responsibilitySource === 'client' ? clientName : 'you'}</span>
                  {overridden && <span>AI suggested {RESP[ai.suggested].label} ·</span>}
                  <button className="linkish" onClick={() => patch.mutate({ responsibility: 'ai' })}>Use AI suggestion</button>
                </>
              )}
            </div>
          </div>
          <div>
            <div className="label-sm"><Bot size={13} /> Summary</div>
            <p className="summary">{ai.summary}</p>
            {ai.keyPoints?.length > 0 && <ul className="keypoints">{ai.keyPoints.map((k, i) => <li key={i}>{k}</li>)}</ul>}
            {ai.dates?.length > 0 && (
              <div className="date-chips">
                {ai.dates.map((d, i) => (
                  <span key={i} className={`date-chip ${d.kind === 'deadline' ? 'date-chip--deadline' : ''}`} title={fullDate(d.date)}>
                    {d.kind === 'deadline' ? <CircleAlert /> : <CalendarClock />}{d.kind === 'deadline' ? 'Due ' : ''}{whenLabel(d.date)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* -------- Conversation -------- */}
      <section className="messages" aria-label="Messages">
        {visible.map((m, i) => {
          const isLast = m.id === msgs[msgs.length - 1].id;
          const open = isLast || expanded[m.id];
          return (
            <div key={m.id} style={{ display: 'contents' }}>
              <div className={`msg ${m.direction === 'out' ? 'msg--out' : ''} ${open ? '' : 'msg--collapsed'}`}>
                <div className="msg__head" onClick={() => !isLast && setExpanded((x) => ({ ...x, [m.id]: !x[m.id] }))}>
                  <Avatar name={m.from.name} />
                  <div className="msg__who grow">
                    <div className="truncate"><b>{m.direction === 'out' ? `${m.from.name}` : m.from.name}</b><span>{m.direction === 'out' ? `on behalf of ${clientName}` : m.from.email}</span></div>
                    {open ? <div className="msg__to truncate">to {m.to?.map((x) => x.name || x.email).join(', ')}</div> : <div className="msg__preview truncate">{m.body.replace(/\s+/g, ' ')}</div>}
                  </div>
                  <span className="msg__date" title={fullDate(m.date)}>{timeAgo(m.date)}</span>
                </div>
                {open && <div className="msg__body">{m.body}</div>}
              </div>
              {i === 0 && hiddenCount > 0 && <button className="collapsed-count" onClick={() => setShowAll(true)}>Show {hiddenCount} earlier {hiddenCount === 1 ? 'message' : 'messages'}</button>}
            </div>
          );
        })}
      </section>

      <Composer thread={t} onUpdate={update} clientName={clientName} />
    </article>
  );
}
