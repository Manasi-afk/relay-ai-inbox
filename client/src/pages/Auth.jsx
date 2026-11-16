import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CircleAlert, Sparkles } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Button, Logo } from '../components/ui.jsx';

const PREVIEW = [
  { from: 'Priya · Meridian Bank', subject: 'Can we move Thursday’s review?', chip: ['assistant', 'You reply'] },
  { from: 'Rohan · Elevation Partners', subject: 'Series B term sheet (confidential)', chip: ['client', 'Client replies'] },
  { from: 'HealthTech Weekly', subject: 'Your weekly digest', chip: ['none', 'No reply'] },
];

export default function AuthPage({ mode }) {
  const isSignup = mode === 'signup';
  const { signIn } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setBusy('form');
    try {
      const { token } = await api(isSignup ? '/auth/signup' : '/auth/login', { method: 'POST', body: form, auth: false });
      signIn(token);
      nav(isSignup ? '/onboarding' : '/app', { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(null);
    }
  }

  async function demo() {
    setError(null);
    setBusy('demo');
    try {
      const { token } = await api('/auth/demo', { method: 'POST', auth: false });
      signIn(token);
      nav('/app', { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="auth">
      <section className="auth__pitch">
        <Logo />
        <h1>Know who needs to reply to every email — before you open it.</h1>
        <p className="lead">Relay reads your client’s inbox, decides whether you, your client or no one should respond, and drafts the routine replies for you to approve.</p>
        <div className="auth__preview" aria-hidden="true">
          {PREVIEW.map((p) => (
            <div className="preview-row" key={p.subject}>
              <div className="grow"><b>{p.subject}</b><span>{p.from}</span></div>
              <span className={`chip chip--${p.chip[0]}`}>{p.chip[1]}</span>
            </div>
          ))}
        </div>
      </section>

      <main className="auth__form-wrap">
        <form className="auth__form" onSubmit={submit} noValidate>
          <div>
            <h2>{isSignup ? 'Create your account' : 'Welcome back'}</h2>
            <p className="muted mt-8">{isSignup ? 'Set up Relay for you and your client in about two minutes.' : 'Sign in to manage your client’s inbox.'}</p>
          </div>

          {error && <div className="form-error" role="alert"><CircleAlert />{error.message}</div>}

          {isSignup && (
            <div className="field">
              <label htmlFor="name">Your name</label>
              <input id="name" className={`input ${error?.field === 'name' ? 'has-error' : ''}`} value={form.name} onChange={set('name')} placeholder="Riya Sharma" autoComplete="name" />
            </div>
          )}
          <div className="field">
            <label htmlFor="email">Work email</label>
            <input id="email" type="email" className={`input ${error?.field === 'email' ? 'has-error' : ''}`} value={form.email} onChange={set('email')} placeholder="you@company.com" autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" className={`input ${error?.field === 'password' ? 'has-error' : ''}`} value={form.password} onChange={set('password')} placeholder={isSignup ? 'At least 8 characters' : '••••••••'} autoComplete={isSignup ? 'new-password' : 'current-password'} />
          </div>
          <Button variant="primary" size="lg" block loading={busy === 'form'} type="submit">{isSignup ? 'Create account' : 'Sign in'}</Button>

          <p className="muted" style={{ textAlign: 'center', fontSize: 13.5 }}>
            {isSignup ? <>Already have an account? <Link to="/login" style={{ color: 'var(--brand)', fontWeight: 600 }}>Sign in</Link></> : <>New to Relay? <Link to="/signup" style={{ color: 'var(--brand)', fontWeight: 600 }}>Create an account</Link></>}
          </p>

          <div className="divider">or</div>
          <div className="demo-box">
            <p><b>Just looking?</b> Explore a ready-made workspace: an assistant managing a CEO’s Gmail and Outlook, already triaged by AI.</p>
            <Button type="button" variant="soft" block loading={busy === 'demo'} onClick={demo}><Sparkles /> Explore the demo workspace</Button>
          </div>
        </form>
      </main>
    </div>
  );
}
