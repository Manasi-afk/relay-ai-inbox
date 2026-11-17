import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '@fontsource-variable/roboto';
import '../styles/landing.css';

/*
 * Three Figma frames: Desktop 1440, Tablet 768, Mobile 375. The page renders the frame that
 * fits the viewport and scales it to the viewport width (never above 1 for desktop/tablet),
 * so each design width is pixel-exact and widths in between are the nearest design, scaled.
 */
const FRAMES = { d: 1440, t: 768, m: 375 };
function pickFrame() {
  const w = typeof document === 'undefined' ? 1440 : document.documentElement.clientWidth;
  const v = w >= 1200 ? 'd' : w >= 600 ? 't' : 'm';
  return { v, zoom: v === 'm' ? w / FRAMES.m : Math.min(1, w / FRAMES[v]) };
}
function useFrame() {
  const [frame, setFrame] = useState(pickFrame);
  useEffect(() => {
    const onResize = () => setFrame(pickFrame());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return frame;
}

/* Iconify glyphs named in the Figma layers; their boxes match the layer CSS insets. */
const MenuIcon = () => ( /* ic:twotone-menu — inset 12.5% / 25% */
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" fill="#000000" /></svg>
);
const CloseIcon = () => ( /* material-symbols:close-rounded — inset 22.6% */
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 13.4l-4.9 4.9q-.275.275-.7.275t-.7-.275t-.275-.7t.275-.7l4.9-4.9l-4.9-4.85q-.275-.275-.275-.7t.275-.7t.7-.275t.7.275l4.9 4.9l4.85-4.9q.275-.275.7-.275t.7.275q.3.3.3.713t-.3.687L13.4 12l4.9 4.9q.275.275.275.7t-.275.7q-.3.3-.712.3t-.688-.3z" fill="#4356D6" /></svg>
);
const MDI = { /* mdi:home — inset 8.33% / 12.5% / 16.67%; mdi:about (information) — inset 8.33% */
  home: 'M10 20v-6h4v6h5v-8h3L12 3L2 12h3v8z',
  about: 'M13 9h-2V7h2m0 10h-2v-6h2m-1-9A10 10 0 0 0 2 12a10 10 0 0 0 10 10a10 10 0 0 0 10-10A10 10 0 0 0 12 2',
};

/* Desktop nav links: w = Figma frame width, tw = text box width */
const NAV = [
  { label: 'Home', href: '/', current: true, w: 69, tw: 49 },
  { label: 'About Us', href: '#about', w: 94, tw: 74 },
  { label: 'Our Services', href: '#services', w: 123, tw: 103 },
  { label: 'Pricing', href: '#pricing', w: 77, tw: 57 },
  { label: 'FAQ', href: '#faq', w: 53, tw: 33 },
  { label: 'Contact', href: '#contact', w: 84, tw: 64 },
];
/* Navbar Tablet Menu / Navbar Mobile Menu (Frame 584): same links, 172px rows (Frame 31 is 171) */
const MENU_ICONS = [
  { svg: MDI.home }, { svg: MDI.about }, { png: '/landing/menu-services.png' },
  { png: '/landing/menu-pricing.png' }, { png: '/landing/menu-faq.png' }, { png: '/landing/menu-contact.png' },
];
const MENU = NAV.map((n, i) => ({ ...n, w: i === 2 ? 171 : 172, icon: MENU_ICONS[i] }));

function MenuDrawer({ onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    document.querySelector('.lp-drawer__close')?.focus();
    return () => { document.body.style.overflow = prevOverflow; document.removeEventListener('keydown', onKey); };
  }, [onClose]);

  return (
    <div className="lp-drawer-layer" role="dialog" aria-modal="true" aria-label="Menu">
      <div className="lp-overlay" onClick={onClose} />
      <aside className="lp-drawer">
        <div className="lp-drawer__head">
          <Link to="/" className="lp-logo" aria-label="Home" onClick={onClose}>
            <img src="/landing/hero-logo.svg" alt="" />
            <span>Logo</span>
          </Link>
          <button type="button" className="lp-drawer__close" aria-label="Close menu" onClick={onClose}><CloseIcon /></button>
        </div>
        <div className="lp-drawer__body">
          <ul className="lp-dlinks">
            {MENU.map((m) => (
              <li key={m.label}>
                <a href={m.href} style={{ width: m.w }} className={m.current ? 'is-current' : undefined} aria-current={m.current ? 'page' : undefined} onClick={onClose}>
                  {m.icon.svg
                    ? <svg className="lp-dlinks__icon" viewBox="0 0 24 24" aria-hidden="true"><path d={m.icon.svg} fill="currentColor" /></svg>
                    : <span className="lp-dlinks__icon lp-dlinks__icon--png" style={{ '--icon': `url("${m.icon.png}")` }} aria-hidden="true" />}
                  <span className="lp-label" style={{ width: m.tw }}>{m.label}</span>
                </a>
              </li>
            ))}
          </ul>
          <a href="#contact" className="lp-btn lp-btn--solid lp-drawer__cta" onClick={onClose}>
            <span className="lp-label" style={{ width: 89 }}>Contact Us</span>
          </a>
        </div>
      </aside>
    </div>
  );
}

const CHECKS = ['End-to-end compliance support', 'Regulatory filings made simple', 'Tailored solutions for independent analysts & firms'];
const UNDERLINE = { d: '/landing/hero-underline.svg', t: '/landing/tab-underline.png', m: '/landing/mob-underline.png' };

function Hero({ v, menuOpen, onOpenMenu }) {
  return (
    <section className="lp-band lp-band--hero" aria-labelledby="lp-hero-title">
      <div className="lp-frame lp-hero">
        <div className="lp-hero__glow" aria-hidden="true" />

        <header className="lp-nav">
          <Link to="/" className="lp-logo" aria-label="Home">
            <img src="/landing/hero-logo.svg" alt="" />
            <span>Logo</span>
          </Link>
          {v === 'd' && (
            <nav aria-label="Main">
              <ul className="lp-nav__links">
                {/* Frame widths fixed to Figma's so link positions match regardless of glyph rounding */}
                {NAV.map((n) => (
                  <li key={n.label}>
                    <a href={n.href} style={{ width: n.w }} aria-current={n.current ? 'page' : undefined}><span className="lp-label" style={{ width: n.tw }}>{n.label}</span></a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
          <div className="lp-nav__end">
            {v !== 'm' && (
              <a href="#contact" className="lp-btn lp-btn--solid lp-btn--contact">
                <span className="lp-btn__icon" aria-hidden="true" />
                <span className="lp-label" style={{ width: 89 }}>Contact Us</span>
              </a>
            )}
            {v !== 'd' && (
              <button type="button" className="lp-menu" aria-label="Open menu" aria-expanded={menuOpen} onClick={onOpenMenu}><MenuIcon /></button>
            )}
          </div>
        </header>

        <div className="lp-hero__copy">
          <div className="lp-hero__title">
            <h1 id="lp-hero-title" className="lp-h1">Simplifying <span className="lp-accent">Compliance</span> for Research Analysts</h1>
            <img className="lp-hero__underline" src={UNDERLINE[v]} alt="" />
          </div>
          <p className="lp-body">
            Stay focused on your insights—we’ll handle the compliance. Our expert solutions ensure your research practices meet every regulatory requirement with confidence and ease
          </p>
          <ul className="lp-checks">
            {CHECKS.map((c) => (
              <li key={c}><img src="/landing/hero-check.svg" alt="" /><span className="lp-body">{c}</span></li>
            ))}
          </ul>
          <div className="lp-hero__ctas">
            <Link to="/signup" className="lp-btn lp-btn--solid"><span className="lp-label" style={{ width: 92 }}>Get started</span></Link>
            <a href="#contact" className="lp-btn lp-btn--outline">{/* Figma's glyphs sit at the right of this 169px text box (measured: ink ends 2px before the box edge) */}
              <span className="lp-label" style={{ width: 169, textAlign: 'right' }}>Book a consultation</span></a>
          </div>
        </div>

        {v === 'm' ? (
          <>
            <img className="lp-hero__banner" src="/landing/hero-banner-objects.svg" alt="" />
            <img className="lp-hero__chevrons" src="/landing/hero-chevrons.svg" alt="" />
          </>
        ) : (
          <img className="lp-hero__banner" src="/landing/hero-banner.svg" alt="" />
        )}

        <div className="lp-stat">
          <span className="lp-stat__icon" aria-hidden="true" />
          <div className="lp-stat__text">
            <span className="lp-title-sm">Trusted by</span>
            <span className="lp-stat__num">250+</span>
            <span className="lp-title-sm">Professionals</span>
          </div>
        </div>

        <div className="lp-rating">
          <span className="lp-rating__num">4.8</span>
          <div className="lp-rating__text">
            <div className="lp-stars" role="img" aria-label="5 out of 5 stars">
              {[0, 1, 2, 3, 4].map((i) => <img key={i} src="/landing/hero-star.svg" alt="" />)}
            </div>
            <span className="lp-title-sm">Clients rating</span>
          </div>
        </div>
      </div>
    </section>
  );
}

const WHY_CARDS = [
  { icon: '/landing/icon-search.png', title: 'Regulatory Clarity', body: 'We decode complex compliance rules into simple, actionable steps.' },
  { icon: '/landing/icon-clarity.png', title: 'Hassle-Free Filings Clarity', body: 'From registration to ongoing reporting—we manage it end-to-end.' },
  { icon: '/landing/icon-risk.png', title: 'Risk Protection', body: 'Stay ahead of audits, inspections, and compliance gaps with proactive support.' },
];
/* Desktop: illustration + separate decorations. Tablet/mobile: the strip between the paragraph
   and the first card (illustration, curved arrow and chevrons) taken from the Figma render. */
const WHY_ART = { d: '/landing/why-illustration.png', t: '/landing/tab-why-art.png', m: '/landing/mob-why-art.png' };

function WhyCompliance({ v }) {
  return (
    <section className="lp-band" aria-labelledby="lp-why-title">
      <div className="lp-frame lp-why">
        <div className="lp-why__inner">
          <div className="lp-why__head">
            <h2 id="lp-why-title" className="lp-h2">
              <span>Why <span className="lp-accent">Compliance Matters</span> for Research Analysts</span>
            </h2>
            <p className="lp-body">
              In today’s regulatory environment, even a small oversight can lead to penalties, reputational risks, and loss of client trust. We help Research Analysts and firms navigate complex compliance requirements so they can focus on delivering high-quality research without worry.
            </p>
          </div>

          <div className="lp-why__body">
            <div className="lp-why__art">
              <img src={WHY_ART[v]} alt="" />
            </div>
            <div className="lp-why__cards">
              {WHY_CARDS.map((c, i) => (
                <article key={c.title} className={`lp-card lp-card--${i + 1}`}>
                  <div className="lp-card__row">
                    <span className="lp-icon" style={{ '--icon': `url("${c.icon}")` }} aria-hidden="true" />
                    <div className="lp-card__text">
                      <h3 className="lp-title">{c.title}</h3>
                      <p className="lp-body">{c.body}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
        {v === 'd' && (
          <>
            <img className="lp-why__squiggle" src="/landing/why-squiggle.png" alt="" />
            <img className="lp-why__chevrons" src="/landing/why-chevrons.png" alt="" />
          </>
        )}
      </div>
    </section>
  );
}

export default function Landing() {
  const { v, zoom } = useFrame();
  // The layout the menu was opened in; it stays open only while that layout is showing.
  const [menuFor, setMenuFor] = useState(null);
  const menuOpen = menuFor === v && v !== 'd';
  const closeMenu = useCallback(() => {
    setMenuFor(null);
    document.querySelector('.lp-menu')?.focus();
  }, []);
  return (
    <main className={`lp lp--${v}`} style={{ '--lp-zoom': zoom }}>
      <Hero v={v} menuOpen={menuOpen} onOpenMenu={() => setMenuFor(v)} />
      <WhyCompliance v={v} />
      {menuOpen && <MenuDrawer onClose={closeMenu} />}
    </main>
  );
}
