'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';

export default function GraphSelectionTip() {
  const [showTip, setShowTip] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDismissed = localStorage.getItem('dismissed-graph-multiselect-tip');
      if (!isDismissed) {
        setShowTip(true);
      }
    }
  }, []);

  const handleDismissTip = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dismissed-graph-multiselect-tip', 'true');
    }
    setShowTip(false);
  };

  if (!showTip) return null;

  return (
    <div
      className="animate-fade-in"
      style={{
        position: 'absolute',
        bottom: '1.25rem',
        left: '1.25rem',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '8px 14px 8px 12px',
        borderRadius: 'var(--radius)',
        background: 'var(--color-surface-raised) var(--noise-bg)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
        backdropFilter: 'blur(8px)',
        maxWidth: 'calc(100% - 2.5rem)',
        color: 'var(--color-text)',
        fontSize: '0.8rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-primary-hover)',
          flexShrink: 0,
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      </div>
      <span style={{ color: 'var(--color-text)', lineHeight: 1.4, fontSize: '0.8rem' }}>
        {t('graph.tip_1')}{' '}
        <kbd style={{
          background: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '4px',
          padding: '1px 5px',
          fontSize: '0.75rem',
          fontFamily: 'var(--font-mono)',
          boxShadow: '0 1px 0 rgba(0,0,0,0.3)',
          color: 'var(--color-text)'
        }}>Ctrl</kbd>{' '}
        {t('graph.tip_2')}{' '}
        <kbd style={{
          background: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '4px',
          padding: '1px 5px',
          fontSize: '0.75rem',
          fontFamily: 'var(--font-mono)',
          boxShadow: '0 1px 0 rgba(0,0,0,0.3)',
          color: 'var(--color-text)'
        }}>⌘</kbd>
        {t('graph.tip_3')}
      </span>
      <button
        onClick={handleDismissTip}
        aria-label={t('graph.dismiss_tip')}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--color-text-muted)',
          cursor: 'pointer',
          padding: '2px 4px',
          fontSize: '1.1rem',
          lineHeight: 1,
          marginLeft: '4px',
          flexShrink: 0,
          transition: 'color 0.2s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
      >
        ×
      </button>
    </div>
  );
}
