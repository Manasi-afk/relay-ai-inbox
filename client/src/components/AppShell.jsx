import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Inbox, LayoutDashboard, LogOut, Menu, Search, Settings2, Sparkles, Zap } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { SEGMENTS } from '../lib/constants.js';
import { firstName, timeAgo } from '../lib/format.js';
import { Avatar, Button, Logo } from './ui.jsx';
import AskPanel from './AskPanel.jsx';

const ShellCtx = createContext(null);
export const useShell = () => useContext(ShellCtx);

const LABELS = { main: null, reply: 'Who replies', smart: 'Smart folders', other: null };

export default function AppShell() {
  const { me, signOut } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const nav = useNavigate();
  const loc = useLocation();
  const [params] = useSearchParams();
  const [navOpen, setNavOpen] = useState(false);
  const [ask, setAsk] = useState({ open: false, seed: null });
  const [focusThread, setFocusThread] = useState(null);
  const [lastNew, setLastNew] = useState(null);
  const [q, setQ] = useState(params.get('q') || '');
  const searchRef = useRef(null);

  const counts = useQuery({ queryKey: ['counts'], queryFn: () => api('/threads/counts'), refetchInterval: 15000 });
  const c = counts.data || {};
  const clientName = firstName(me.client?.name);

  useEffect(() => setNavOpen(false), [loc.pathname, loc.search]);
  useEffect(() => { setQ(params.get('q') || ''); }, [params]);
  useEffect(() => {
    const h = (e) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const mailboxes = me.mailboxes || [];
  const syncing = mailboxes.some((m) => m.status === 'syncing');
  const paused = mailboxes.filter((m) => m.status === 'disconnected' || m.status === 'error').length;
  const lastSync = mailboxes.map((m) => m.lastSyncedAt).filter(Boolean).sort().pop();
  const liveMailbox = mailboxes.find((m) => m.provider === 'gmail' && m.status === 'connected') || mailboxes.find((m) => m.status === 'connected');

  const simulate = useMutation({
    mutationFn: () => api(`/mailboxes/${liveMailbox._id}/simulate`, { method: 'POST' }),
    onSuccess: ({ thread, kind }) => {
      qc.invalidateQueries();
      setLastNew(thread.id);
      const owner = { assistant: 'Assistant to Reply', client: `${clientName} to Reply`, none: 'No Reply Needed' }[thread.responsibility];
      toast(`${kind === 'reply' ? 'New reply' : 'New email'} from ${firstName(thread.lastFrom?.name)} · AI sorted it into ${owner}${thread.ai?.needsReview ? ' (flagged for review)' : ''}`, {
        type: 'ai', duration: 6500, action: { label: 'View', onClick: () => nav(`/app/inbox/inbox?thread=${thread.id}`) },
      });
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  });

  function submitSearch(e) {
    e.preventDefault();
    const seg = loc.pathname.startsWith('/app/inbox/') ? loc.pathname.split('/')[3] : 'inbox';
    nav(`/app/inbox/${seg}${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`);
  }

  const openAsk = (seed = null) => setAsk({ open: true, seed });
  const segLink = (key) => `/app/inbox/${key}`;
  const activeSeg = loc.pathname.startsWith('/app/inbox') ? (loc.pathname.split('/')[3] || 'inbox') : null;

  return (
    <ShellCtx.Provider value={{ openAsk, focusThread, setFocusThread, lastNew, counts: c, clientName, simulate, liveMailbox }}>
      <div className={`shell ${navOpen ? 'nav-open' : ''}`}>
        <aside className="sidebar" aria-label="Navigation">
          <Logo />
          <div className="client-card">
            <Avatar name={me.client?.name} />
            <div className="grow">
              <b className="truncate">{me.client?.name}</b>
              <span className="truncate">{[me.client?.title, me.client?.company].filter(Boolean).join(' · ') || 'Your client'}</span>
            </div>
          </div>
          <NavLink end to="/app" className="nav-item"><LayoutDashboard /> Dashboard</NavLink>
          {Object.entries(LABELS).map(([group, label]) => (
            <div key={group} style={{ display: 'contents' }}>
              {label && <div className="nav-label">{label}</div>}
              {group === 'other' && <div style={{ height: 8 }} />}
              {SEGMENTS.filter((s) => s.group === group).map((s) => {
                const count = c[s.key];
                const strong = ['review', 'assistant'].includes(s.key) && count > 0;
                return (
                  <NavLink key={s.key} to={segLink(s.key)} className={() => `nav-item ${activeSeg === s.key ? 'active' : ''}`}>
                    {s.tone ? <span className={`swatch swatch--${s.tone}`} /> : <s.icon />}
                    <span className="truncate">{s.key === 'client' ? `${clientName} to Reply` : s.label}</span>
                    {count > 0 && !['done', 'archived'].includes(s.key) && <span className={`count ${strong ? 'count--strong' : ''}`}>{count}</span>}
                  </NavLink>
                );
              })}
            </div>
          ))}
          <div className="sidebar__foot">
            <a className="nav-item" href={`/c/${me.client?.portalToken}`} target="_blank" rel="noreferrer"><ExternalLink /> {clientName}’s view</a>
            <NavLink to="/app/accounts" className="nav-item"><Settings2 /> Accounts</NavLink>
            <div className="user-chip">
              <Avatar name={me.user.name} size="sm" />
              <div className="grow"><b className="truncate">{me.user.name}</b><span className="truncate">{me.user.email}</span></div>
              <button className="icon-btn icon-btn--sm" onClick={signOut} aria-label="Sign out" title="Sign out"><LogOut /></button>
            </div>
          </div>
        </aside>
        <div className="drawer-backdrop" onClick={() => setNavOpen(false)} />

        <div className="main">
          <header className="topbar">
            <button className="icon-btn mobile-only" onClick={() => setNavOpen(true)} aria-label="Open menu"><Menu /></button>
            <form className="search" onSubmit={submitSearch} role="search">
              <Search />
              <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people, subjects, content…" aria-label="Search conversations" />
              <kbd>/</kbd>
            </form>
            <div className="topbar__actions">
              <span className={`sync-pill desktop-only ${syncing ? 'sync-pill--syncing' : paused ? 'sync-pill--warn' : ''}`} title={mailboxes.map((m) => `${m.address}: ${m.status}`).join('\n')}>
                <span className="pulse" />
                {syncing ? 'Syncing…' : paused ? `${paused} account paused` : `Synced ${lastSync ? timeAgo(lastSync).toLowerCase() : ''}`}
              </span>
              {liveMailbox && (
                <Button size="sm" className="desktop-only" onClick={() => simulate.mutate()} loading={simulate.isPending} title="Simulates a new email arriving from the provider">
                  {!simulate.isPending && <Zap />} Simulate new email
                </Button>
              )}
              <Button size="sm" className="ask-btn" onClick={() => openAsk()}><Sparkles /> <span className="desktop-only">Ask Relay</span></Button>
            </div>
          </header>
          <div className="content">
            <Outlet />
          </div>
        </div>

        <nav className="tabbar" aria-label="Primary">
          <NavLink end to="/app" className="tab"><LayoutDashboard /> Home</NavLink>
          <NavLink to="/app/inbox/assistant" className={() => `tab ${activeSeg ? 'active' : ''}`}><Inbox /> Inbox{c.assistant + (c.review || 0) > 0 && <span className="count count--strong">{c.assistant}</span>}</NavLink>
          <button className="tab" onClick={() => (liveMailbox ? simulate.mutate() : null)} disabled={simulate.isPending}><Zap /> {simulate.isPending ? 'Receiving…' : 'New email'}</button>
          <NavLink to="/app/accounts" className="tab"><Settings2 /> Accounts</NavLink>
        </nav>

        {ask.open && <AskPanel seed={ask.seed} focusThread={focusThread} onClose={() => setAsk({ open: false, seed: null })} />}
      </div>
    </ShellCtx.Provider>
  );
}
