import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bot, CalendarClock, ChevronRight, Clock3, ExternalLink, Flag, Hand, Mail, MailOpen, PartyPopper, Sparkles, Star, UserRound, UserRoundCheck, Settings2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { firstName, greeting, timeAgo, whenLabel } from '../lib/format.js';
import { Avatar, Button, EmptyState, ErrorState, Skeleton, ThreadChips } from '../components/ui.jsx';
import { useShell } from '../components/AppShell.jsx';

const ACT_ICON = { ai: Bot, client: UserRound, assistant: UserRoundCheck, system: Settings2 };

export default function Dashboard() {
  const { me } = useAuth();
  const { openAsk, clientName } = useShell();
  const nav = useNavigate();
  const qc = useQueryClient();
  const syncing = me.mailboxes.some((m) => m.status === 'syncing');
  const q = useQuery({ queryKey: ['dashboard'], queryFn: () => api('/dashboard'), refetchInterval: syncing ? 2000 : 15000 });

  // mark client updates as seen once the assistant has looked at the dashboard
  useEffect(() => {
    if (q.data?.clientUpdates) {
      const t = setTimeout(() => api('/activity/seen', { method: 'POST' }).then(() => qc.invalidateQueries({ queryKey: ['dashboard'] })), 4000);
      return () => clearTimeout(t);
    }
  }, [q.data?.clientUpdates, qc]);

  if (q.isError) return <div className="page"><ErrorState error={q.error} onRetry={q.refetch} /></div>;
  const d = q.data;
  const open = (id) => nav(`/app/inbox/inbox?thread=${id}`);
  const s = d?.stats;

  const stats = [
    { key: 'assistant', label: 'You reply', value: s?.assistant, icon: UserRoundCheck, seg: 'assistant' },
    { key: 'client', label: `${clientName} replies`, value: s?.client, icon: UserRound, seg: 'client' },
    { key: 'review', label: 'Needs review', value: s?.review, icon: Flag, seg: 'review' },
    { key: 'waiting', label: 'Waiting on others', value: s?.waiting, icon: Clock3, seg: 'waiting' },
    { key: 'unread', label: 'Unread', value: s?.unread, icon: MailOpen, seg: 'unread' },
    { key: 'important', label: 'Important', value: s?.important, icon: Star, seg: 'important' },
  ];

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">{greeting()}, {firstName(me.user.name)}</h1>
          <p className="page__sub">
            {d ? <>Here’s {clientName}’s inbox at a glance · {d.stats.total} conversations across {d.mailboxes.length} {d.mailboxes.length === 1 ? 'account' : 'accounts'}</> : 'Loading the latest…'}
          </p>
        </div>
        <Button onClick={() => openAsk('Show me emails that need my attention')}><Sparkles /> What needs me today?</Button>
      </div>

      {d && s.none > 0 && (
        <div className="ai-banner">
          <Sparkles />
          <span>Relay triaged <b>{s.total}</b> conversations. <b>{s.none}</b> need no reply, so you can skip them. {s.review > 0 && <><b>{s.review}</b> {s.review === 1 ? 'is' : 'are'} flagged because the AI wasn’t sure who should reply.</>}</span>
        </div>
      )}

      <div className="stats">
        {stats.map((st) => (
          <Link key={st.key} to={`/app/inbox/${st.seg}`} className={`stat stat--${st.key}`}>
            <div className="stat__top">{st.label}<span className="stat__icon"><st.icon /></span></div>
            <div className="stat__value">{d ? st.value : <Skeleton w={36} h={24} />}</div>
          </Link>
        ))}
      </div>

      <div className="dash-grid">
        <div className="dash-col">
          <section className="card">
            <div className="card__head">
              <UserRoundCheck size={18} color="var(--assistant)" />
              <h2 className="card__title">Needs your reply</h2>
              <Link to="/app/inbox/assistant" className="card__more">View all <ChevronRight /></Link>
            </div>
            <MiniList loading={!d} items={d?.needsYou} onOpen={open} clientName={clientName}
              empty={<EmptyState icon={PartyPopper} title="You’re all caught up">No conversations are waiting on you.</EmptyState>} />
          </section>

          <section className="card">
            <div className="card__head">
              <UserRound size={18} color="var(--client)" />
              <h2 className="card__title">Waiting on {clientName}</h2>
              <a href={`/c/${me.client?.portalToken}`} target="_blank" rel="noreferrer" className="card__more">Open {clientName}’s view <ExternalLink /></a>
            </div>
            <MiniList loading={!d} items={d?.clientQueue} onOpen={open} clientName={clientName} showWhy
              empty={<EmptyState icon={UserRound} title={`Nothing for ${clientName}`}>Emails that need a personal reply will appear here.</EmptyState>} />
          </section>
        </div>

        <div className="dash-col">
          <section className="card">
            <div className="card__head">
              <CalendarClock size={18} color="var(--brand)" />
              <h2 className="card__title">Coming up</h2>
              <Link to="/app/inbox/meetings" className="card__more">Meetings <ChevronRight /></Link>
            </div>
            {!d ? <div className="card__body"><Skeleton h={40} /><Skeleton h={40} style={{ marginTop: 8 }} /></div> : d.upcoming.length ? (
              <div className="timeline">
                {d.upcoming.map((u, i) => {
                  const date = new Date(u.date);
                  return (
                    <button key={i} className="tl-item" onClick={() => open(u.threadId)}>
                      <div className="tl-date"><small className={u.kind === 'deadline' ? 'deadline' : ''}>{date.toLocaleDateString('en-GB', { month: 'short' })}</small><b>{date.getDate()}</b></div>
                      <div className="grow"><b className="truncate">{u.subject.replace(/^Re: /, '')}</b><span className="truncate" style={{ display: 'block', color: u.kind === 'deadline' ? 'var(--review)' : undefined }}>{u.kind === 'deadline' ? 'Due ' : ''}{whenLabel(u.date)}</span></div>
                    </button>
                  );
                })}
              </div>
            ) : <EmptyState icon={CalendarClock} title="Nothing scheduled">Meetings and deadlines found in emails show up here.</EmptyState>}
          </section>

          <section className="card">
            <div className="card__head">
              <Clock3 size={18} color="var(--waiting)" />
              <h2 className="card__title">Waiting for a response</h2>
              <Link to="/app/inbox/waiting" className="card__more">All <ChevronRight /></Link>
            </div>
            <MiniList loading={!d} items={d?.waiting} onOpen={open} clientName={clientName} compact
              empty={<EmptyState icon={Clock3} title="Not waiting on anyone">Threads you’ve replied to are tracked here.</EmptyState>} />
          </section>

          <section className="card">
            <div className="card__head">
              <Bot size={18} color="var(--ink-2)" />
              <h2 className="card__title">Activity</h2>
              {d?.clientUpdates > 0 && <span className="chip chip--client">{d.clientUpdates} new from {clientName}</span>}
            </div>
            {!d ? <div className="card__body"><Skeleton h={30} /></div> : d.activity.length ? (
              <div className="activity">
                {d.activity.slice(0, 8).map((a) => {
                  const Icon = a.actor === 'client' && a.type === 'client_handover' ? Hand : ACT_ICON[a.actor] || Mail;
                  return (
                    <div key={a._id} className={`act act--${a.actor} ${a.actor === 'client' && !a.seen ? 'is-new' : ''}`} onClick={() => a.thread && open(a.thread)} style={{ cursor: a.thread ? 'pointer' : 'default' }}>
                      <span className="act__icon"><Icon /></span>
                      <div className="grow">{a.text}<time>{timeAgo(a.createdAt)}</time></div>
                    </div>
                  );
                })}
              </div>
            ) : <EmptyState icon={Bot} title="No activity yet" />}
          </section>
        </div>
      </div>
    </div>
  );
}

function MiniList({ items, loading, onOpen, empty, clientName, showWhy, compact }) {
  if (loading) return <div className="card__body"><Skeleton h={44} /><Skeleton h={44} style={{ marginTop: 10 }} /><Skeleton h={44} style={{ marginTop: 10 }} /></div>;
  if (!items?.length) return empty;
  return (
    <div className="mini-list">
      {items.map((t) => (
        <button key={t.id} className="mini" onClick={() => onOpen(t.id)}>
          <Avatar name={t.from?.name} size="sm" />
          <div className="mini__main">
            <div className="mini__top">
              <span className="mini__from truncate">{t.from?.name}</span>
              {t.unread && <span className="dot" />}
              <span className="mini__time">{t.waiting ? `Sent ${timeAgo(t.lastMessageAt)}` : timeAgo(t.lastMessageAt)}</span>
            </div>
            <div className="mini__subject truncate">{t.subject}</div>
            {!compact && <div className="mini__summary">{showWhy ? t.ai?.clientReason || t.ai?.summary : t.clientNote ? `${clientName}: “${t.clientNote}”` : t.ai?.summary}</div>}
            {!compact && <div className="mini__chips"><ThreadChips thread={t} clientName={clientName} max={3} /></div>}
          </div>
        </button>
      ))}
    </div>
  );
}
