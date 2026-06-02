'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: 'Upload', id: 'nav-upload' },
  { href: '/graph', label: 'Graph', id: 'nav-graph' },
  { href: '/emails', label: 'Emails', id: 'nav-emails' },
  { href: '/stats', label: 'Stats', id: 'nav-stats' },
  { href: '/session', label: 'Session', id: 'nav-session' },
  { href: '/settings', label: 'Settings', id: 'nav-settings' },
];

export default function Header() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header
      className="header-shell"
      style={{
        height: 64,
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 clamp(0.75rem, 3vw, 1.5rem)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >


      {/* Logo */}
      <Link
        href="/"
        className="header-brand"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          textDecoration: 'none',
        }}
      >
        <Image
          src="/dagex-nobg.png"
          alt="EntityGraph logo"
          width={54}
          height={54}
          priority
          style={{ objectFit: 'contain' }}
        />
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.1rem',
            fontWeight: 500,
            color: 'var(--color-text)',
            letterSpacing: '-0.01em',
          }}
        >
          EntityGraph
        </span>
        <span
          className="hidden sm:inline-block"
          style={{
            fontSize: '0.7rem',
            color: 'var(--color-text-muted)',
            background: 'color-mix(in srgb, var(--color-secondary) 15%, transparent)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '2px 8px',
            fontFamily: 'var(--font-mono)',
          }}
        >
          v1.4.0
        </span>
      </Link>

      {/* Desktop Nav (Hidden on Mobile) */}
      <nav className="header-nav hidden md:flex" style={{ gap: '0.25rem' }}>
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              id={item.id}
              href={item.href}
              style={{
                padding: '0.5rem clamp(0.5rem, 2vw, 1.25rem)',
                minHeight: 40,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.875rem',
                fontWeight: 500,
                textDecoration: 'none',
                color: active ? 'var(--color-primary)' : 'var(--color-text-muted)',
                background: active ? 'color-mix(in srgb, var(--color-secondary) 15%, transparent)' : 'transparent',
                border: `1px solid ${active ? 'var(--color-secondary)' : 'transparent'}`,
                transition: 'all var(--transition-fast)',
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Mobile Nav (Hamburger) */}
      <div className="md:hidden relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle navigation menu"
          style={{
            background: 'color-mix(in srgb, var(--color-secondary) 8%, transparent)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--color-text)',
            transition: 'all var(--transition-fast)',
            outline: 'none',
          }}
        >
          {isOpen ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          )}
        </button>

        {isOpen && (
          <>
            {/* Click-outside full page overlay backdrop */}
            <div
              onClick={() => setIsOpen(false)}
              style={{
                position: 'fixed',
                top: 64,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 99,
                background: 'rgba(0, 0, 0, 0.6)',
              }}
            />

            {/* Float Dropdown Menu */}
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '180px',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius)',
                padding: '6px',
                boxShadow: '0 12px 30px rgba(0, 0, 0, 0.6)',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                zIndex: 100,
              }}
            >
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    id={`${item.id}-mobile`}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    style={{
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      textDecoration: 'none',
                      color: active ? 'var(--color-primary)' : 'var(--color-text-muted)',
                      background: active ? 'color-mix(in srgb, var(--color-secondary) 15%, transparent)' : 'transparent',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    {item.label}
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
