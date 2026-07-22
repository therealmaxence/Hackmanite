'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useCallback, type CSSProperties } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';

type NavItem = { href: string; labelKey: string; id: string };
type NavGroup = { key: string; labelKey: string; id: string; items: NavItem[] };

const UPLOAD_ITEM: NavItem = { href: '/', labelKey: 'nav.upload', id: 'nav-upload' };
const NAV_GROUPS: NavGroup[] = [
  {
    key: 'view',
    labelKey: 'nav.menu.view',
    id: 'nav-menu-view',
    items: [
      { href: '/graph', labelKey: 'nav.graph', id: 'nav-graph' },
      { href: '/emails', labelKey: 'nav.emails', id: 'nav-emails' },
      { href: '/stats', labelKey: 'nav.stats', id: 'nav-stats' },
      { href: '/weak-signals', labelKey: 'nav.weak_signals', id: 'nav-weak-signals' },
    ],
  },
  {
    key: 'custom-analysis',
    labelKey: 'nav.menu.custom_analysis',
    id: 'nav-menu-custom-analysis',
    items: [
      { href: '/pipelines', labelKey: 'nav.pipelines', id: 'nav-pipelines' },
      { href: '/ai-report', labelKey: 'nav.ai_report', id: 'nav-ai-report' },
    ],
  },
  {
    key: 'general-settings',
    labelKey: 'nav.menu.general_settings',
    id: 'nav-menu-general-settings',
    items: [
      { href: '/session', labelKey: 'nav.session', id: 'nav-session' },
      { href: '/settings', labelKey: 'nav.settings', id: 'nav-settings' },
      { href: '/help', labelKey: 'nav.help', id: 'nav-help' },
    ],
  },
];

const activeSurfaceId = (path: string) => path === UPLOAD_ITEM.href
  ? UPLOAD_ITEM.id
  : NAV_GROUPS.find((group) => group.items.some((item) => item.href === path))?.id;

const navButtonStyle = (active: boolean): CSSProperties => ({
  padding: '0.5rem clamp(0.5rem, 2vw, 1.1rem)',
  minHeight: 40,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.375rem',
  borderRadius: 'var(--radius-sm)',
  fontSize: '0.875rem',
  fontWeight: 500,
  textDecoration: 'none',
  color: active ? 'var(--color-primary-hover)' : 'var(--color-text-muted)',
  background: 'transparent',
  border: 'none',
  boxShadow: 'none',
  position: 'relative',
  zIndex: 1,
  cursor: 'pointer',
  transition: 'color 180ms ease-out',
});

export default function Header() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [logoHovered, setLogoHovered] = useState(false);
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0, height: 0, top: 0 });
  const { t } = useTranslation();

  const syncPill = useCallback((path: string) => {
    const id = activeSurfaceId(path);
    const el = id ? document.getElementById(id) : null;
    setPillStyle(el ? { left: el.offsetLeft, width: el.offsetWidth, height: el.offsetHeight, top: el.offsetTop } : { left: 0, width: 0, height: 0, top: 0 });
  }, []);

  useEffect(() => { syncPill(pathname); }, [pathname, syncPill]);

  const hoverSurface = (el: HTMLElement, active: boolean) => {
    if (!active) el.style.color = 'var(--color-primary-hover)';
    setPillStyle({ left: el.offsetLeft, width: el.offsetWidth, height: el.offsetHeight, top: el.offsetTop });
  };

  return (
    <header className="header-shell" style={{
      height: 64, background: 'var(--color-surface)', borderBottom: 'none', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', padding: '0 clamp(0.75rem, 3vw, 1.5rem)', position: 'sticky', top: 0, zIndex: 100,
    }}>
      <Link
        href="/" className="header-brand" onMouseEnter={() => setLogoHovered(true)} onMouseLeave={() => setLogoHovered(false)}
        style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{ position: 'relative', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              position: 'absolute', width: 30, height: 30, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(124, 58, 237, 0.5) 0%, rgba(217, 70, 239, 0.15) 60%, transparent 100%)',
              filter: 'blur(5px)', zIndex: 0, opacity: logoHovered ? 1 : 0, transform: logoHovered ? 'scale(1.2)' : 'scale(0.8)',
              transition: 'all 200ms cubic-bezier(0.22, 1, 0.36, 1)',
            }} />
            <Image src="/hackmanite_main_nobg.png" alt="Hackmanite logo" width={40} height={40} priority style={{ objectFit: 'contain', position: 'relative', zIndex: 1 }} />
          </div>

          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', fontWeight: 300 }}>×</span>

          <div style={{ position: 'relative', width: 52, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Image src="/geode_logo.png" alt="GEODE logo" width={52} height={52} priority style={{ objectFit: 'contain', borderRadius: '4px', transform: 'scale(1.1)' }} />
          </div>
        </div>

        <span style={{
          fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600,
          background: 'linear-gradient(to right, #ffffff 40%, var(--color-primary-hover) 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'inline-block', letterSpacing: '-0.01em',
        }}>
          Hackmanite
        </span>
        <span style={{
          fontSize: '0.65rem', fontWeight: 600, color: 'var(--color-primary-hover)',
          background: 'rgba(124, 58, 237, 0.15)', borderRadius: '4px', padding: '2px 6px',
        }}>
          by GEODE
        </span>
        <span className="hidden sm:inline-block" style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', background: 'var(--color-surface-raised)', border: 'none', borderRadius: 'var(--radius-sm)', padding: '2px 8px', fontFamily: 'var(--font-mono)' }}>
          v1.0.0
        </span>
      </Link>

      <nav className="header-nav hidden md:flex" style={{ gap: '0.25rem', position: 'relative', alignItems: 'center' }} onMouseLeave={() => { setOpenMenu(null); syncPill(pathname); }}>
        <div style={{ position: 'absolute', background: 'var(--color-surface-raised) var(--noise-bg)', borderRadius: 'var(--radius-sm)', transition: 'all 220ms cubic-bezier(0.25, 1, 0.5, 1)', zIndex: 0, opacity: pillStyle.width === 0 ? 0 : 1, pointerEvents: 'none', ...pillStyle }} />
        <Link
          id={UPLOAD_ITEM.id}
          href={UPLOAD_ITEM.href}
          style={navButtonStyle(pathname === UPLOAD_ITEM.href)}
          onMouseEnter={(e) => hoverSurface(e.currentTarget, pathname === UPLOAD_ITEM.href)}
          onMouseLeave={(e) => { if (pathname !== UPLOAD_ITEM.href) e.currentTarget.style.color = 'var(--color-text-muted)'; }}
        >
          {t(UPLOAD_ITEM.labelKey)}
        </Link>
        {NAV_GROUPS.map((group) => {
          const active = group.items.some((item) => item.href === pathname);
          const expanded = openMenu === group.key;
          return (
            <div
              key={group.key}
              id={group.id}
              style={{ position: 'relative', zIndex: 2 }}
              onMouseEnter={(e) => {
                setOpenMenu(group.key);
                hoverSurface(e.currentTarget, active);
              }}
              onMouseLeave={() => setOpenMenu(null)}
            >
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={expanded}
                style={navButtonStyle(active || expanded)}
                onClick={() => setOpenMenu(expanded ? null : group.key)}
                onFocus={(e) => {
                  setOpenMenu(group.key);
                  hoverSurface(e.currentTarget.parentElement!, active);
                }}
              >
                {t(group.labelKey)}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 160ms ease' }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {expanded && (
                <div style={{ position: 'absolute', top: '100%', left: 0, paddingTop: 8, zIndex: 10 }}>
                  <div role="menu" style={{ minWidth: 190, background: 'var(--color-surface)', border: '1px solid var(--color-surface-raised)', borderRadius: 'var(--radius)', padding: 6, boxShadow: '0 16px 34px rgba(0, 0, 0, 0.48)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {group.items.map((item) => {
                      const itemActive = pathname === item.href;
                      return (
                        <Link key={item.href} href={item.href} role="menuitem" onClick={() => setOpenMenu(null)} style={{ padding: '0.625rem 0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem', fontWeight: 500, textDecoration: 'none', color: itemActive ? 'var(--color-primary-hover)' : 'var(--color-text-muted)', background: itemActive ? 'var(--color-surface-raised)' : 'transparent', transition: 'background-color 120ms ease, color 120ms ease' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-raised)'; e.currentTarget.style.color = 'var(--color-primary-hover)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = itemActive ? 'var(--color-surface-raised)' : 'transparent'; e.currentTarget.style.color = itemActive ? 'var(--color-primary-hover)' : 'var(--color-text-muted)'; }}>
                          {t(item.labelKey)}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
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
            <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: '230px', background: 'var(--color-surface)', border: 'none', borderRadius: 'var(--radius)', padding: '6px', boxShadow: '0 12px 30px rgba(0, 0, 0, 0.6)', display: 'flex', flexDirection: 'column', gap: '2px', zIndex: 100 }}>
              <Link href={UPLOAD_ITEM.href} onClick={() => setIsOpen(false)} style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', fontWeight: 500, textDecoration: 'none', color: pathname === UPLOAD_ITEM.href ? 'var(--color-primary-hover)' : 'var(--color-text-muted)', background: pathname === UPLOAD_ITEM.href ? 'var(--color-surface-raised)' : 'transparent', transition: 'background-color 80ms ease, color 300ms ease-in' }}>
                {t(UPLOAD_ITEM.labelKey)}
              </Link>
              {NAV_GROUPS.map((group) => (
                <div key={group.key} style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 6, marginTop: 4, borderTop: '1px solid var(--color-surface-raised)' }}>
                  <span style={{ padding: '0.375rem 1rem 0.25rem', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t(group.labelKey)}</span>
                  {group.items.map((item) => {
                    const active = pathname === item.href;
                    return (
                      <Link key={item.href} id={`${item.id}-mobile`} href={item.href} onClick={() => setIsOpen(false)} style={{ padding: '0.625rem 1rem', display: 'flex', alignItems: 'center', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', fontWeight: 500, textDecoration: 'none', color: active ? 'var(--color-primary-hover)' : 'var(--color-text-muted)', background: active ? 'var(--color-surface-raised)' : 'transparent', transition: 'background-color 80ms ease, color 300ms ease-in' }}>
                        {t(item.labelKey)}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </header>
  );
}
