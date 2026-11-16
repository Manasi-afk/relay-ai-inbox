import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Bot, Copy, ExternalLink, KeyRound, Link2, Pause, Play, Plus, RefreshCw, ShieldCheck, Trash2, Zap } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { firstName, timeAgo } from '../lib/format.js';
import { Avatar, Button, Modal, ProviderIcon, providerName } from '../components/ui.jsx';
import { useShell } from '../components/AppShell.jsx';

export default function Accounts() {
  const { me, refetchMe } = useAuth();
  const { simulate } = useShell();
  const toast = useToast();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(null);
  const [address, setAddress] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(null);
  const name = firstName(me.client?.name);
  const link = `${window.location.origin}/c/${me.client?.portalToken}`;

  const refresh = () => { refetchMe(); qc.invalidateQueries(); };
  const run = useMutation({
    mutationFn: ({ path, method = 'POST', body }) => api(path, { method, body }),
    onSuccess: (_d, v) => { refresh(); v.msg && toast(v.msg); setAdding(null); setConfirmRemove(null); },
    onError: (e) => toast(e.message, { type: 'error' }),
  });

  const providers = new Set(me.mailboxes.map((m) => m.provider));
  const copy = async () => { try { await navigator.clipboard.writeText(link); toast('Link copied'); } catch { toast(link, { type: 'info' }); } };

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">Accounts</h1>
          <p className="page__sub">Connected inboxes, sync status and {name}’s client view.</p>
        </div>
      </div>
      <div className="acct-grid">
        <div className="dash-col">
          <section className="card">
            <div className="card__head">
              <h2 className="card__title">Connected email accounts</h2>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                {['gmail', 'outlook'].filter((p) => !providers.has(p)).map((p) => (
                  <Button key={p} size="sm" onClick={() => { setAdding(p); setAddress(p === 'outlook' ? `${name.toLowerCase()}@outlook.com` : me.client?.email); }}><Plus /> {providerName(p)}</Button>
                ))}
              </div>
            </div>
            {me.mailboxes.map((m) => (
              <div className="mailbox" key={m._id}>
                <ProviderIcon provider={m.provider} />
                <div className="grow">
                  <b className="truncate">{m.address}</b>
                  <span className="sub">{providerName(m.provider)} · <span className={`status status--${m.status}`}>{m.status === 'syncing' ? `Syncing ${m.syncProgress}/${m.syncTotal}` : m.status === 'disconnected' ? 'Paused' : m.status === 'error' ? 'Sync error' : 'Connected'}</span>{m.lastSyncedAt && m.status !== 'syncing' ? ` · last synced ${timeAgo(m.lastSyncedAt).toLowerCase()}` : ''}</span>
                </div>
                <div className="actions">
                  {m.status === 'connected' && <Button size="sm" variant="ghost" title="Sync now" onClick={() => run.mutate({ path: `/mailboxes/${m._id}/sync`, msg: `${m.address} is up to date` })}><RefreshCw /></Button>}
                  {m.status === 'disconnected'
                    ? <Button size="sm" onClick={() => run.mutate({ path: `/mailboxes/${m._id}/status`, body: { status: 'connected' }, msg: 'Reconnected' })}><Play /> Resume</Button>
                    : <Button size="sm" variant="ghost" onClick={() => run.mutate({ path: `/mailboxes/${m._id}/status`, body: { status: 'disconnected' }, msg: 'Sync paused. Emails from this account are hidden.' })} disabled={m.status === 'syncing'}><Pause /> Pause</Button>}
                  <Button size="sm" variant="ghost" className="btn--danger" title="Remove account" onClick={() => setConfirmRemove(m)}><Trash2 /></Button>
                </div>
              </div>
            ))}
          </section>

          <section className="card">
            <div className="card__head"><Zap size={18} color="var(--brand)" /><h2 className="card__title">Try live classification</h2></div>
            <div className="card__body">
              <p className="muted">Simulate an email arriving from the provider. Relay classifies it instantly, and replies to existing threads trigger a re-classification (e.g. a thread you were waiting on becomes “Assistant to Reply”).</p>
              <Button className="mt-12" onClick={() => simulate.mutate()} loading={simulate.isPending}>{!simulate.isPending && <Zap />} Simulate new email</Button>
            </div>
          </section>
        </div>

        <div className="dash-col">
          <section className="card">
            <div className="card__head"><Link2 size={18} color="var(--client)" /><h2 className="card__title">{name}’s client view</h2></div>
            <div className="card__body">
              <div className="row"><Avatar name={me.client?.name} /><div><b>{me.client?.name}</b><div className="subtle" style={{ fontSize: 12.5 }}>{me.client?.email}</div></div></div>
              <p className="muted mt-12">A private, minimal page showing only emails classified <b>Client to Reply</b>, with a one-tap “I’ve handled it” or “Hand to {firstName(me.user.name)}”.</p>
              <div className="copy-field mt-12">
                <input className="input" readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Client view link" />
                <Button onClick={copy} aria-label="Copy link"><Copy /></Button>
              </div>
              <div className="row mt-12" style={{ flexWrap: 'wrap' }}>
                <a className="btn btn--sm" href={link} target="_blank" rel="noreferrer"><ExternalLink /> Open</a>
                <Button size="sm" variant="ghost" onClick={() => run.mutate({ path: '/client/rotate-link', msg: 'New link created, the old one no longer works' })}><KeyRound /> Reset link</Button>
              </div>
            </div>
          </section>

          <section className="card">
            <div className="card__head"><Bot size={18} color="var(--brand)" /><h2 className="card__title">AI engine</h2></div>
            <div className="card__body info-list">
              <div><ShieldCheck /><span>{me.ai.provider === 'heuristic' ? <>Running on Relay’s <b>built-in rules engine</b>. Set <code>ANTHROPIC_API_KEY</code> or <code>GEMINI_API_KEY</code> on the server to switch to an LLM.</> : <>Classifying with <b>{me.ai.engine}</b>, with the rules engine as a fallback.</>}</span></div>
              <div><ShieldCheck /><span>Replies are only sent after you review and approve them.</span></div>
              <div><ShieldCheck /><span>Your corrections always win. A new message re-checks the conversation.</span></div>
            </div>
          </section>
        </div>
      </div>

      {adding && (
        <Modal title={`Connect ${providerName(adding)}`} subtitle="Simulated OAuth consent for this prototype." onClose={() => setAdding(null)} icon={<ProviderIcon provider={adding} />}
          footer={<><Button variant="ghost" onClick={() => setAdding(null)}>Cancel</Button><Button variant="primary" loading={run.isPending} onClick={() => run.mutate({ path: '/mailboxes', body: { provider: adding, address }, msg: 'Connected · syncing and classifying now' })}>Allow access</Button></>}>
          <div className="field"><label htmlFor="na">Email address</label><input id="na" className="input" value={address} onChange={(e) => setAddress(e.target.value)} /></div>
        </Modal>
      )}
      {confirmRemove && (
        <Modal title="Remove this account?" subtitle={`${confirmRemove.address} and its ${providerName(confirmRemove.provider)} conversations will be removed from Relay. You can reconnect it later.`} onClose={() => setConfirmRemove(null)}
          footer={<><Button variant="ghost" onClick={() => setConfirmRemove(null)}>Cancel</Button><Button variant="primary" style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }} loading={run.isPending} onClick={() => run.mutate({ path: `/mailboxes/${confirmRemove._id}`, method: 'DELETE', msg: 'Account removed' })}>Remove</Button></>}>
          <p className="muted">This only affects Relay. Nothing is deleted from the mailbox itself.</p>
        </Modal>
      )}
    </div>
  );
}
