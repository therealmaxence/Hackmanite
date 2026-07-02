'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';

const NAV_ITEMS = [
  { href: '/', labelKey: 'nav.upload', id: 'nav-upload' },
  { href: '/graph', labelKey: 'nav.graph', id: 'nav-graph' },
  { href: '/emails', labelKey: 'nav.emails', id: 'nav-emails' },
  { href: '/stats', labelKey: 'nav.stats', id: 'nav-stats' },
  { href: '/weak-signals', labelKey: 'nav.weak_signals', id: 'nav-weak-signals' },
  { href: '/ai-report', labelKey: 'nav.ai_report', id: 'nav-ai-report' },
  { href: '/pipelines', labelKey: 'nav.pipelines', id: 'nav-pipelines' },
  { href: '/session', labelKey: 'nav.session', id: 'nav-session' },
  { href: '/settings', labelKey: 'nav.settings', id: 'nav-settings' },
  { href: '/help', labelKey: 'nav.help', id: 'nav-help' },
];

export default function Header() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [logoHovered, setLogoHovered] = useState(false);
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0, height: 0, top: 0 });
  const { t } = useTranslation();

  const syncPill = (path: string) => {
    const item = NAV_ITEMS.find((i) => path === i.href);
    const el = item ? document.getElementById(item.id) : null;
    setPillStyle(el ? { left: el.offsetLeft, width: el.offsetWidth, height: el.offsetHeight, top: el.offsetTop } : { left: 0, width: 0, height: 0, top: 0 });
  };

  useEffect(() => { syncPill(pathname); }, [pathname]);

  return (
    <header className="header-shell" style={{
      height: 64, background: 'var(--color-surface)', borderBottom: 'none', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', padding: '0 clamp(0.75rem, 3vw, 1.5rem)', position: 'sticky', top: 0, zIndex: 10,
    }}>
      <Link
        href="/" className="header-brand" onMouseEnter={() => setLogoHovered(true)} onMouseLeave={() => setLogoHovered(false)}
        style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none' }}
      >
        <div style={{ position: 'relative', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            position: 'absolute', width: 30, height: 30, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(124, 58, 237, 0.5) 0%, rgba(217, 70, 239, 0.15) 60%, transparent 100%)',
            filter: 'blur(5px)', zIndex: 0, opacity: logoHovered ? 1 : 0, transform: logoHovered ? 'scale(1.2)' : 'scale(0.8)',
            transition: 'all 200ms cubic-bezier(0.22, 1, 0.36, 1)',
          }} />
          <Image src="/hackmanite_main_nobg.png" alt="Hackmanite logo" width={40} height={40} priority style={{ objectFit: 'contain', position: 'relative', zIndex: 1 }} />
        </div>
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600,
          background: 'linear-gradient(to right, #ffffff 40%, var(--color-primary-hover) 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'inline-block', letterSpacing: '-0.01em',
        }}>
          Hackmanite
        </span>
        <span className="hidden sm:inline-block" style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', background: 'var(--color-surface-raised)', border: 'none', borderRadius: 'var(--radius-sm)', padding: '2px 8px', fontFamily: 'var(--font-mono)' }}>
          v1.0.0
        </span>
      </Link>

      <nav className="header-nav hidden md:flex" style={{ gap: '0.25rem', position: 'relative' }} onMouseLeave={() => syncPill(pathname)}>
        <div style={{ position: 'absolute', background: 'var(--color-surface-raised) var(--noise-bg)', borderRadius: 'var(--radius-sm)', transition: 'all 220ms cubic-bezier(0.25, 1, 0.5, 1)', zIndex: 0, opacity: pillStyle.width === 0 ? 0 : 1, pointerEvents: 'none', ...pillStyle }} />
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href} id={item.id} href={item.href}
              style={{
                padding: '0.5rem clamp(0.5rem, 2vw, 1.25rem)', minHeight: 40, display: 'inline-flex', alignItems: 'center',
                justifyContent: 'center', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', fontWeight: 500,
                textDecoration: 'none', color: active ? 'var(--color-primary-hover)' : 'var(--color-text-muted)',
                background: 'transparent', border: 'none', boxShadow: 'none', position: 'relative', zIndex: 1, transition: 'color 180ms ease-out',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                if (!active) el.style.color = 'var(--color-primary-hover)';
                setPillStyle({ left: el.offsetLeft, width: el.offsetWidth, height: el.offsetHeight, top: el.offsetTop });
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.color = 'var(--color-text-muted)';
              }}
            >
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>

      <div className="md:hidden relative">
        <button onClick={() => setIsOpen(!isOpen)} aria-label="Toggle navigation menu" style={{ background: 'var(--color-surface-raised)', border: 'none', borderRadius: 'var(--radius-sm)', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text)', transition: 'all var(--transition-fast)', outline: 'none' }}>
          {isOpen ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="18" x2="20" y2="18" /></svg>
          )}
        </button>
        {isOpen && (
          <>
            <div onClick={() => setIsOpen(false)} style={{ position: 'fixed', top: 64, left: 0, right: 0, bottom: 0, zIndex: 99, background: 'rgba(0, 0, 0, 0.6)' }} />
            <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: '180px', background: 'var(--color-surface)', border: 'none', borderRadius: 'var(--radius)', padding: '6px', boxShadow: '0 12px 30px rgba(0, 0, 0, 0.6)', display: 'flex', flexDirection: 'column', gap: '2px', zIndex: 100 }}>
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link key={item.href} id={`${item.id}-mobile`} href={item.href} onClick={() => setIsOpen(false)} style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', fontWeight: 500, textDecoration: 'none', color: active ? 'var(--color-primary-hover)' : 'var(--color-text-muted)', background: active ? 'var(--color-surface-raised)' : 'transparent', transition: 'background-color 80ms ease, color 300ms ease-in' }}>
                    {t(item.labelKey)}
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </header>
  );
}
