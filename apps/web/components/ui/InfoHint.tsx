'use client';

import { useState, useEffect, useRef, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';

interface InfoHintProps {
  title: string;
  body: string;
  detail?: string;
  visible?: boolean;
  idleOpacity?: number;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'left' | 'center' | 'right';
  panelWidth?: number;
}

export default function InfoHint({
  title,
  body,
  detail,
  visible = true,
  idleOpacity = 0.9,
  placement = 'top',
  align = 'center',
  panelWidth = 280,
}: InfoHintProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateCoords = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    let top = 0;
    let left = 0;

    if (placement === 'right') {
      left = rect.right + 8;
      top = rect.top + rect.height / 2;
    } else if (placement === 'left') {
      left = rect.left - panelWidth - 8;
      top = rect.top + rect.height / 2;
    } else {
      top = placement === 'bottom' ? rect.bottom + 8 : rect.top - 8;
      left = align === 'left'
        ? rect.left
        : align === 'right'
          ? rect.right - panelWidth
          : rect.left + rect.width / 2 - panelWidth / 2;
    }

    setCoords({ top, left });
  };

  useEffect(() => {
    if (!open) return;
    updateCoords();
    window.addEventListener('scroll', updateCoords, true);
    window.addEventListener('resize', updateCoords, true);
    return () => {
      window.removeEventListener('scroll', updateCoords, true);
      window.removeEventListener('resize', updateCoords, true);
    };
  }, [open, placement, align, panelWidth]);

  const canInteract = visible || open;

  const tooltipElement = open && coords && (
    <span
      role="tooltip"
      style={{
        position: 'fixed',
        left: coords.left,
        top: coords.top,
        width: panelWidth,
        transform: (placement === 'right' || placement === 'left')
          ? 'translateY(-50%)'
          : placement === 'top'
            ? 'translateY(-100%)'
            : 'none',
        background: 'var(--color-surface-raised)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-sm)',
        padding: '0.75rem 0.875rem',
        boxShadow: '0 12px 24px rgba(0, 0, 0, 0.48)',
        zIndex: 99999,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem',
        textAlign: 'left',
        whiteSpace: 'normal',
      }}
    >
      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text)' }}>{title}</span>
      <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', lineHeight: 1.45 }}>{body}</span>
      {detail && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-primary-hover)', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.045)', borderRadius: 2, padding: '0.25rem 0.45rem', wordBreak: 'break-word' }}>
          {detail}
        </span>
      )}
    </span>
  );

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={`${title} help`}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 16,
          height: 16,
          borderRadius: '50%',
          border: '1px solid var(--color-text-muted)',
          background: 'var(--color-surface)',
          color: 'var(--color-text-muted)',
          fontSize: 10,
          fontWeight: 700,
          lineHeight: 1,
          cursor: 'help',
          opacity: open ? 0.9 : visible ? idleOpacity : 0,
          pointerEvents: canInteract ? 'auto' : 'none',
          transition: 'opacity 0.12s ease, color 0.12s ease, border-color 0.12s ease',
        }}
      >
        i
      </button>
      {mounted && createPortal(tooltipElement, document.body)}
    </span>
  );
}
