import { useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, CircleCheck, Inbox as InboxIcon, MailOpen, Search, Star, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { EMPTY_COPY, SEGMENTS, segmentByKey } from '../lib/constants.js';
import { timeAgo } from '../lib/format.js';
import { Avatar, EmptyState, ErrorState, ListSkeleton, ThreadChips, providerName } from '../components/ui.jsx';
import { useShell } from '../components/AppShell.jsx';
import ThreadView from '../components/ThreadView.jsx';

export default function Inbox() {
  const { segment = 'inbox' } = useParams();
  const [params, setParams] = useSearchParams();
  const { me } = useAuth();
  const { clientName, counts, lastNew } = useShell();
  const toast = useToast();
  const qc = useQueryClient();
  const nav = useNavigate();
  const q = params.get('q') || '';
  const mailbox = params.get('mailbox') || 'all';
  const selected = params.get('thread');
  const seg = segmentByKey[segment] || segmentByKey.inbox;
  const segLabel = segment === 'client' ? `${clientName} to Reply` : seg.label;

  const detailRef = useRef(null);
  useEffect(() => { detailRef.current?.scrollTo({ top: 0 }); }, [selected]);

  const list = useQuery({
    queryKey: ['threads', segment, q, mailbox],
    queryFn: () => api(`/threads?segment=${segment}&q=${encodeURIComponent(q)}&mailbox=${mailbox}`),
    refetchInterval: 15000,
    placeholderData: (prev) => prev,
  });

  const setParam = (k, v) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    setParams(next, { replace: k !== 'thread' });
  };

  // Desktop: open the first conversation automatically so the right pane is never blank.
  useEffect(() => {
    if (!selected && list.data?.length && window.innerWidth > 960) setParam('thread', list.data[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.data, selected]);

  const quick = useMutation({
    mutationFn: ({ id, patch }) => api(`/threads/${id}`, { method: 'PATCH', body: patch }),
    onSuccess: (_d, { id, patch, undo }) => {
      qc.invalidateQueries();
      if (undo) toast(undo.msg, { action: { label: 'Undo', onClick: () => quick.mutate({ id, patch: undo.patch }) } });
      if ((patch.archived || patch.completed) && selected === id) setParam('thread', null);
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  });

  const pills = useMemo(() => SEGMENTS.filter((s) => s.group !== 'hidden' && !['done', 'archived'].includes(s.key)), []);
  const [emptyTitle, emptyText] = q ? ['No matches', `Nothing in ${segLabel} matches “${q}”.`] : EMPTY_COPY[segment] || EMPTY_COPY.inbox;

  return (
    <div className={`inbox ${selected ? 'has-thread' : ''}`}>
      <section className="list-pane" aria-label="Conversations">
        <div className="list-head">
          <div className="row">
            <h2 className="truncate">{segLabel}</h2>
            {me.mailboxes.length > 1 && (
              <select className="select select--sm" style={{ width: 'auto' }} value={mailbox} onChange={(e) => setParam('mailbox', e.target.value === 'all' ? null : e.target.value)} aria-label="Filter by account">
                <option value="all">All accounts</option>
                {me.mailboxes.map((m) => <option key={m._id} value={m._id}>{providerName(m.provider)} · {m.address}</option>)}
              </select>
            )}
          </div>
          {seg.hint && <p className="subtle" style={{ fontSize: 12.5, marginTop: -4 }}>{seg.hint}</p>}
          {q && (
            <div className="row">
              <span className="chip chip--brand"><Search /> “{q}”</span>
              <button className="linkish" onClick={() => setParam('q', null)}><X size={12} style={{ verticalAlign: -2 }} /> Clear search</button>
            </div>
          )}
          <div className="seg-scroller" role="tablist">
            {pills.map((s) => (
              <Link key={s.key} to={`/app/inbox/${s.key}${q ? `?q=${encodeURIComponent(q)}` : ''}`} className={`seg-pill ${segment === s.key ? 'active' : ''}`} role="tab" aria-selected={segment === s.key}>
                {s.key === 'client' ? `${clientName}` : s.key === 'assistant' ? 'You reply' : s.key === 'none' ? 'No reply' : s.label}
                {counts[s.key] > 0 && <span className="count">{counts[s.key]}</span>}
              </Link>
            ))}
          </div>
        </div>

        <div className="list">
          {list.isPending ? <ListSkeleton /> : list.isError ? <ErrorState error={list.error} onRetry={list.refetch} /> : !list.data.length ? (
            <EmptyState icon={q ? Search : InboxIcon} title={emptyTitle}>{emptyText}</EmptyState>
          ) : list.data.map((t) => (
            <div
              key={t.id}
              role="button"
              tabIndex={0}
              className={`item ${t.unread ? 'unread' : ''} ${selected === t.id ? 'active' : ''} ${lastNew === t.id ? 'item--new' : ''}`}
              onClick={() => setParam('thread', t.id)}
              onKeyDown={(e) => e.key === 'Enter' && setParam('thread', t.id)}
            >
              {t.unread && <span className="unread-dot" aria-label="Unread" />}
              <Avatar name={t.from?.name} />
              <div className="item__body">
                <div className="item__top">
                  <span className="item__from truncate">{t.waiting ? `To: ${t.from?.name}` : t.from?.name}</span>
                  {t.messageCount > 1 && <span className="subtle" style={{ fontSize: 12 }}>{t.messageCount}</span>}
                  {t.starred && <Star size={13} fill="#E8A400" color="#E8A400" />}
                  <span className="item__time">{timeAgo(t.lastMessageAt)}</span>
                </div>
                <div className="item__subject truncate">{t.subject}</div>
                <div className="item__snippet">{t.clientNote && t.clientStatus === 'handover' ? `${clientName}: “${t.clientNote}”` : t.ai?.summary || t.snippet}</div>
                <div className="item__chips"><ThreadChips thread={t} clientName={clientName} /></div>
              </div>
              <div className="item__actions" onClick={(e) => e.stopPropagation()}>
                <button className={`icon-btn icon-btn--sm ${t.starred ? 'is-on' : ''}`} title={t.starred ? 'Unstar' : 'Mark important'} onClick={() => quick.mutate({ id: t.id, patch: { starred: !t.starred } })}><Star /></button>
                <button className="icon-btn icon-btn--sm" title="Mark unread" onClick={() => quick.mutate({ id: t.id, patch: { unread: true } })}><MailOpen /></button>
                {!t.completed && <button className="icon-btn icon-btn--sm" title="Mark done" onClick={() => quick.mutate({ id: t.id, patch: { completed: true }, undo: { msg: 'Marked as done', patch: { completed: false } } })}><CircleCheck /></button>}
                {!t.archived && <button className="icon-btn icon-btn--sm" title="Archive" onClick={() => quick.mutate({ id: t.id, patch: { archived: true }, undo: { msg: 'Conversation archived', patch: { archived: false } } })}><Archive /></button>}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="detail-pane" aria-label="Conversation" ref={detailRef}>
        {selected ? (
          <ThreadView key={selected} id={selected} onClose={() => setParam('thread', null)} onGone={() => nav(`/app/inbox/${segment}`)} />
        ) : (
          <div className="empty-detail"><EmptyState icon={InboxIcon} title="Select a conversation">Pick an email to see the AI summary, who should reply, and a draft.</EmptyState></div>
        )}
      </section>
    </div>
  );
}
