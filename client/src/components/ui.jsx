import { useEffect } from 'react';
import { CircleAlert, Clock3, Flag, Hand, Mail, X } from 'lucide-react';
import { RESP } from '../lib/constants.js';
import { initials } from '../lib/format.js';

export function Logo({ className = '' }) {
  return (
    <span className={`logo ${className}`}>
      <svg className="logo__mark" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="#4F46E5" />
        <path d="M9 11.5h9.5a4 4 0 0 1 0 8H14l-3.5 3v-3H9z" fill="#fff" />
        <circle cx="22.5" cy="10" r="3" fill="#FBBF24" />
      </svg>
      Relay
    </span>
  );
}

export const Spinner = ({ size = 18 }) => <span className="spinner" style={{ width: size, height: size }} aria-label="Loading" />;

export function Button({ variant, size, block, loading, children, className = '', ...props }) {
  const cls = ['btn', variant && `btn--${variant}`, size && `btn--${size}`, block && 'btn--block', className].filter(Boolean).join(' ');
  return (
    <button className={cls} disabled={loading || props.disabled} {...props}>
      {loading ? <Spinner size={15} /> : null}
      {children}
    </button>
  );
}

const AVATAR_COLORS = ['#4F46E5', '#0E7C73', '#B45309', '#BE185D', '#2563EB', '#7C3AED', '#0369A1', '#15803D', '#C2410C', '#4D5BCE'];
export function Avatar({ name = '', size }) {
  const hash = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  return (
    <span className={`avatar ${size ? `avatar--${size}` : ''}`} style={{ background: AVATAR_COLORS[hash % AVATAR_COLORS.length] }} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

/** The single most important indicator in the product: who replies. */
export function OwnerChip({ thread, clientName, compact }) {
  if (thread.classifying) return <span className="chip chip--neutral"><Spinner size={10} /> Classifying…</span>;
  if (thread.waiting && thread.responsibility === 'none') return <span className="chip chip--waiting" title={thread.ai?.reason}><Clock3 /> {compact ? 'Waiting' : 'Waiting on them'}</span>;
  const r = RESP[thread.responsibility];
  if (!r) return null;
  const Icon = r.icon;
  const text = thread.responsibility === 'client' && clientName ? `${clientName} to reply` : r.label;
  return (
    <span className={`chip chip--${r.tone}`} title={thread.ai?.reason}>
      <Icon /> {compact ? r.short : text}
    </span>
  );
}

export function ThreadChips({ thread, clientName, max = 4 }) {
  const chips = [<OwnerChip key="o" thread={thread} clientName={clientName} />];
  if (thread.ai?.needsReview && thread.responsibilitySource === 'ai' && !thread.completed) chips.push(<span key="r" className="chip chip--review"><Flag /> Review</span>);
  if (thread.clientStatus === 'handover') chips.push(<span key="h" className="chip chip--brand"><Hand /> Handed to you</span>);
  if (thread.waiting && thread.responsibility !== 'none') chips.push(<span key="w" className="chip chip--waiting"><Clock3 /> Waiting</span>);
  if (thread.ai?.priority === 'high' && !thread.completed) chips.push(<span key="p" className="chip chip--high">High priority</span>);
  if (thread.hasDraft) chips.push(<span key="d" className="tag">Draft</span>);
  if (thread.ai?.categories?.includes('meeting')) chips.push(<span key="m" className="tag">Meeting</span>);
  return <>{chips.slice(0, max)}</>;
}

export function Skeleton({ w = '100%', h = 12, style }) {
  return <div className="skeleton" style={{ width: w, height: h, ...style }} />;
}

export function ListSkeleton({ rows = 6 }) {
  return (
    <div aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, padding: '16px 18px', borderBottom: '1px solid var(--line-2)' }}>
          <Skeleton w={36} h={36} style={{ borderRadius: '50%', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skeleton w="45%" h={12} />
            <Skeleton w="80%" h={11} />
            <Skeleton w="60%" h={11} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon = Mail, title, children, action }) {
  return (
    <div className="state">
      <div className="state__icon"><Icon /></div>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action && <div className="mt-8">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="state state--error" role="alert">
      <div className="state__icon"><CircleAlert /></div>
      <h3>Couldn’t load this</h3>
      <p>{error?.message || 'Something went wrong.'}</p>
      {onRetry && <Button className="mt-8" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function Modal({ title, subtitle, onClose, children, footer, wide, icon }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal ${wide ? 'modal--wide' : ''}`} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}>
        {title && (
          <div className="modal__head">
            {icon}
            <div className="grow">
              <div className="modal__title">{title}</div>
              {subtitle && <p className="muted mt-8" style={{ marginTop: 4 }}>{subtitle}</p>}
            </div>
            {onClose && <button className="icon-btn icon-btn--sm" onClick={onClose} aria-label="Close"><X /></button>}
          </div>
        )}
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__foot">{footer}</div>}
      </div>
    </div>
  );
}

export function ProviderIcon({ provider, size }) {
  return (
    <span className={`prov-icon prov-icon--${provider} ${size === 'sm' ? 'prov-icon--sm' : ''}`} aria-hidden="true">
      <Mail />
    </span>
  );
}

export const providerName = (p) => (p === 'gmail' ? 'Gmail' : 'Outlook');
