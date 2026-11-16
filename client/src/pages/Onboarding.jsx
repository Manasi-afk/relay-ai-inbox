import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check, CircleAlert, Copy, LockKeyhole, MailMinus, ShieldCheck, Sparkles, UserRound, UserRoundCheck } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Avatar, Button, Logo, Modal, ProviderIcon, Spinner, providerName } from '../components/ui.jsx';
import { firstName } from '../lib/format.js';

const STEPS = 5;

export default function Onboarding() {
  const { me, refetchMe, signOut } = useAuth();
  const initial = !me.client ? 0 : !me.mailboxes.length ? 2 : 3;
  const [step, setStep] = useState(initial);

  return (
    <div className="onb">
      <header className="onb__top">
        <Logo />
        <div className="onb__steps" aria-label={`Step ${step + 1} of ${STEPS}`}>
          {Array.from({ length: STEPS }).map((_, i) => <span key={i} className={`onb__step ${i <= step ? 'is-done' : ''}`} />)}
        </div>
        <button className="btn btn--ghost btn--sm" onClick={signOut}>Sign out</button>
      </header>
      <main className="onb__main">
        <div className="card onb__card">
          {step === 0 && <Welcome name={me.user.name} onNext={() => setStep(1)} />}
          {step === 1 && <ClientStep me={me} onBack={() => setStep(0)} onNext={async () => { await refetchMe(); setStep(2); }} />}
          {step === 2 && <ConnectStep me={me} onBack={() => setStep(1)} onNext={async () => { await refetchMe(); setStep(3); }} />}
          {step === 3 && <SyncStep me={me} onConnectMore={() => setStep(2)} onNext={() => setStep(4)} />}
          {step === 4 && <ShareStep me={me} />}
        </div>
      </main>
    </div>
  );
}

function Welcome({ name, onNext }) {
  const features = [
    { icon: UserRoundCheck, bg: 'var(--assistant-bg)', fg: 'var(--assistant)', t: 'Know who replies', d: 'Every conversation is tagged Assistant to Reply, Client to Reply or No Reply Needed.' },
    { icon: Sparkles, bg: 'var(--brand-50)', fg: 'var(--brand)', t: 'AI that does the reading', d: 'Summaries, deadlines, meetings and draft replies, ready for your review.' },
    { icon: UserRound, bg: 'var(--client-bg)', fg: 'var(--client)', t: 'A calm view for your client', d: 'Your client only sees the few emails that genuinely need them.' },
  ];
  return (
    <>
      <p className="onb__eyebrow">Welcome, {firstName(name)}</p>
      <h1 className="onb__title">Let’s set up your client’s inbox</h1>
      <p className="onb__lead">Relay helps personal assistants stay on top of a busy executive’s email, without reading every message twice.</p>
      <div className="feature-list">
        {features.map((f) => (
          <div className="feature" key={f.t}>
            <div className="feature__icon" style={{ background: f.bg, color: f.fg }}><f.icon /></div>
            <div><b>{f.t}</b><span>{f.d}</span></div>
          </div>
        ))}
      </div>
      <div className="onb__actions"><span /><Button variant="primary" size="lg" onClick={onNext}>Get started <ArrowRight /></Button></div>
    </>
  );
}

function ClientStep({ me, onBack, onNext }) {
  const [form, setForm] = useState({
    name: me.client?.name || '', email: me.client?.email || '', title: me.client?.title || '', company: me.client?.company || '',
  });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const fillSample = () => setForm({ name: 'Ananya Rao', email: 'ananya@lumenhealth.co', title: 'Founder & CEO', company: 'Lumen Health' });

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try { await api('/client', { method: 'PUT', body: form }); await onNext(); } catch (err) { setError(err); } finally { setBusy(false); }
  }

  return (
    <form onSubmit={save} noValidate>
      <p className="onb__eyebrow">Step 1 · Your client</p>
      <h1 className="onb__title">Who do you assist?</h1>
      <p className="onb__lead">Relay uses this to decide which emails need your client personally. <button type="button" className="linkish" onClick={fillSample}>Use sample client</button></p>
      {error && <div className="form-error mt-16" role="alert"><CircleAlert />{error.message}</div>}
      <div className="grid-2 mt-24">
        <div className="field"><label htmlFor="cn">Full name</label><input id="cn" className={`input ${error?.field === 'name' ? 'has-error' : ''}`} value={form.name} onChange={set('name')} placeholder="Ananya Rao" /></div>
        <div className="field"><label htmlFor="ce">Email</label><input id="ce" type="email" className={`input ${error?.field === 'email' ? 'has-error' : ''}`} value={form.email} onChange={set('email')} placeholder="ananya@company.com" /></div>
        <div className="field"><label htmlFor="ct">Role <span className="subtle">(optional)</span></label><input id="ct" className="input" value={form.title} onChange={set('title')} placeholder="Founder & CEO" /></div>
        <div className="field"><label htmlFor="cc">Company <span className="subtle">(optional)</span></label><input id="cc" className="input" value={form.company} onChange={set('company')} placeholder="Lumen Health" /></div>
      </div>
      <div className="onb__actions">
        <Button type="button" variant="ghost" onClick={onBack}><ArrowLeft /> Back</Button>
        <Button variant="primary" size="lg" type="submit" loading={busy}>Continue <ArrowRight /></Button>
      </div>
    </form>
  );
}

function ConnectStep({ me, onBack, onNext }) {
  const connected = new Set(me.mailboxes.map((m) => m.provider));
  const [provider, setProvider] = useState(null);
  const [address, setAddress] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const open = (p) => {
    setProvider(p);
    setError(null);
    const first = firstName(me.client?.name || '').toLowerCase();
    setAddress(p === 'gmail' && !me.mailboxes.some((m) => m.address === me.client?.email) ? me.client?.email || '' : `${first}.${(me.client?.name || '').split(' ').slice(-1)[0]?.toLowerCase()}@outlook.com`);
  };

  async function allow() {
    setBusy(true);
    setError(null);
    try { await api('/mailboxes', { method: 'POST', body: { provider, address } }); setProvider(null); await onNext(); } catch (err) { setError(err); } finally { setBusy(false); }
  }

  return (
    <>
      <p className="onb__eyebrow">Step 2 · Connect email</p>
      <h1 className="onb__title">Connect {firstName(me.client?.name)}’s inbox</h1>
      <p className="onb__lead">Pick the account you manage. You can add more later, for example a work Gmail and a personal Outlook.</p>
      <div className="provider-grid">
        {['gmail', 'outlook'].map((p) => (
          <button key={p} className="provider" onClick={() => open(p)} disabled={connected.has(p)}>
            <ProviderIcon provider={p} />
            <div><b>{providerName(p)}</b><br /><span>{p === 'gmail' ? 'Google Workspace or Gmail' : 'Microsoft 365 or Outlook.com'}</span></div>
            {connected.has(p) && <span className="chip chip--success"><Check /> Connected</span>}
          </button>
        ))}
      </div>
      <div className="info-list mt-24">
        <div><LockKeyhole /><span className="muted">Prototype: the sign-in is simulated and loads realistic sample mail. Nothing leaves this demo.</span></div>
      </div>
      <div className="onb__actions">
        <Button variant="ghost" onClick={onBack}><ArrowLeft /> Back</Button>
        {me.mailboxes.length > 0 && <Button variant="primary" onClick={onNext}>Continue <ArrowRight /></Button>}
      </div>

      {provider && (
        <Modal onClose={() => !busy && setProvider(null)} title={null}>
          <div className="consent">
            <div className="consent__logos"><ProviderIcon provider={provider} /> ⇄ <Logo /></div>
            <h3 className="modal__title">Relay wants to access your {providerName(provider)} account</h3>
            <div className="field mt-16" style={{ textAlign: 'left' }}>
              <label htmlFor="addr">Account</label>
              <input id="addr" className={`input ${error ? 'has-error' : ''}`} value={address} onChange={(e) => setAddress(e.target.value)} />
              {error && <span className="err">{error.message}</span>}
            </div>
            <div className="consent__list mt-16">
              <div><Check /><span>Read email messages and conversation history</span></div>
              <div><Check /><span>Draft replies, and send them <b>only after you approve</b></span></div>
              <div><Check /><span>Manage labels, read status and archive</span></div>
            </div>
            <p className="consent__note"><ShieldCheck size={12} style={{ verticalAlign: -2 }} /> Simulated OAuth consent for this prototype. A production build would use {provider === 'gmail' ? 'Google OAuth + Gmail API' : 'Microsoft identity platform + Graph API'}.</p>
            <div className="row mt-16" style={{ justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setProvider(null)} disabled={busy}>Cancel</Button>
              <Button variant="primary" onClick={allow} loading={busy}>Allow access</Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function SyncStep({ me, onNext, onConnectMore }) {
  const syncing = me.mailboxes.some((m) => m.status === 'syncing');
  const done = me.mailboxes.reduce((a, m) => a + (m.syncProgress || 0), 0);
  const total = me.mailboxes.reduce((a, m) => a + (m.syncTotal || 0), 0) || 1;
  const counts = useQuery({ queryKey: ['counts', 'all'], queryFn: () => api('/threads/counts'), refetchInterval: syncing ? 1500 : false });
  const c = counts.data;
  const canAddMore = me.mailboxes.length < 2;

  return (
    <>
      <p className="onb__eyebrow">Step 3 · Sync &amp; triage</p>
      <h1 className="onb__title">{syncing ? 'Reading and sorting the inbox…' : 'Inbox triaged'}</h1>
      <p className="onb__lead">{syncing ? 'Relay is importing recent conversations and deciding who needs to reply to each one.' : `Relay sorted ${c?.inbox ?? '…'} open conversations. Here’s who needs to reply:`}</p>
      <div className="sync-box">
        {me.mailboxes.map((m) => (
          <div key={m._id} className="row">
            <ProviderIcon provider={m.provider} size="sm" />
            <div className="grow">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <b className="truncate">{m.address}</b>
                <span className={`status status--${m.status}`}>{m.status === 'syncing' ? `${m.syncProgress}/${m.syncTotal}` : 'Synced'}</span>
              </div>
              <div className="progress mt-8"><div style={{ width: `${Math.round(((m.syncProgress || 0) / (m.syncTotal || 1)) * 100)}%` }} /></div>
            </div>
          </div>
        ))}
        <div className="sync-stats">
          <div className="sync-stat sync-stat--assistant"><b>{c?.assistant ?? 0}</b><span><UserRoundCheck size={12} /> You reply</span></div>
          <div className="sync-stat sync-stat--client"><b>{c?.client ?? 0}</b><span><UserRound size={12} /> {firstName(me.client?.name)} replies</span></div>
          <div className="sync-stat sync-stat--none"><b>{c?.none ?? 0}</b><span><MailMinus size={12} /> No reply</span></div>
        </div>
        {syncing && <p className="row muted"><Spinner size={14} /> Classified {done} of {total}</p>}
      </div>
      <div className="onb__actions">
        {canAddMore && !syncing ? <Button variant="ghost" onClick={onConnectMore}>+ Connect another account</Button> : <span />}
        <Button variant="primary" size="lg" onClick={onNext} disabled={syncing}>Continue <ArrowRight /></Button>
      </div>
    </>
  );
}

function ShareStep({ me }) {
  const qc = useQueryClient();
  const nav = useNavigate();
  const toast = useToast();
  const { refetchMe } = useAuth();
  const [busy, setBusy] = useState(false);
  const link = useMemo(() => `${window.location.origin}/c/${me.client?.portalToken}`, [me.client]);
  const name = firstName(me.client?.name);

  async function finish() {
    setBusy(true);
    await api('/onboarding/complete', { method: 'POST' });
    await refetchMe();
    qc.invalidateQueries();
    nav('/app', { replace: true });
  }
  const copy = async () => { try { await navigator.clipboard.writeText(link); toast('Link copied'); } catch { toast('Copy failed, select the link manually', { type: 'error' }); } };

  useEffect(() => { qc.invalidateQueries({ queryKey: ['dashboard'] }); }, [qc]);

  return (
    <>
      <p className="onb__eyebrow">Step 4 · Client view</p>
      <h1 className="onb__title">Give {name} a calm inbox</h1>
      <p className="onb__lead">{name} gets a private, minimal page with only the emails that need a personal reply. One tap to mark it handled or hand it back to you, and you’ll see the update instantly.</p>
      <div className="field mt-24">
        <label>{name}’s private link</label>
        <div className="copy-field">
          <input className="input" readOnly value={link} onFocus={(e) => e.target.select()} />
          <Button onClick={copy}><Copy /> Copy</Button>
        </div>
        <span className="hint">No password needed. You can reset this link anytime from Accounts.</span>
      </div>
      <div className="row mt-16 muted"><Avatar name={me.client?.name} size="sm" /> {name} will see sender, subject, AI summary and why their reply is needed.</div>
      <div className="onb__actions">
        <a className="btn" href={link} target="_blank" rel="noreferrer">Preview client view</a>
        <Button variant="primary" size="lg" onClick={finish} loading={busy}>Open my dashboard <ArrowRight /></Button>
      </div>
    </>
  );
}
