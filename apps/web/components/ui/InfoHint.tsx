'use client';

import { useState, type CSSProperties } from 'react';

interface InfoHintProps {
  title: string;
  body: string;
  detail?: string;
  visible?: boolean;
  idleOpacity?: number;
  placement?: 'top' | 'bottom';
  align?: 'left' | 'center' | 'right';
  panelWidth?: number;
}

export default function InfoHint({ title, body, detail, visible = true, idleOpacity = 0.9, placement = 'top', align = 'center', panelWidth = 280 }: InfoHintProps) {
  const [open, setOpen] = useState(false);
  const canInteract = visible || open;
  const horizontal: CSSProperties = align === 'left'
    ? { left: 0 }
    : align === 'right'
      ? { right: 0 }
      : { left: '50%', transform: 'translateX(-50%)' };

  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
      <button
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
      {open && (
        <span
          role="tooltip"
          style={{
            position: 'absolute',
            ...(placement === 'top' ? { bottom: 'calc(100% + 8px)' } : { top: 'calc(100% + 8px)' }),
            ...horizontal,
            width: panelWidth,
            background: 'var(--color-surface-raised)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.75rem 0.875rem',
            boxShadow: '0 12px 24px rgba(0, 0, 0, 0.48)',
            zIndex: 100,
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
      )}
    </span>
  );
}
