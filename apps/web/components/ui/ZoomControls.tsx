'use client';

import React from 'react';
import { useTranslation } from '@/lib/i18n';

interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
}

export default function ZoomControls({ onZoomIn, onZoomOut, onFit }: ZoomControlsProps) {
  const { t } = useTranslation();

  return (
    <div style={{
      position: 'absolute',
      top: '1rem',
      left: '1rem',
      background: 'var(--color-surface-raised) var(--noise-bg)',
      borderRadius: 'var(--radius)',
      padding: '6px',
      display: 'flex',
      gap: '4px',
      zIndex: 50,
      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
    }}>
      {[
        { label: t('emails.canvas.fit') || 'Fit', title: t('emails.canvas.fit') || 'Fit', action: onFit },
        { label: '+', title: t('emails.canvas.zoom_in') || 'Zoom In', action: onZoomIn },
        { label: '-', title: t('emails.canvas.zoom_out') || 'Zoom Out', action: onZoomOut },
      ].map(({ label, title, action }) => (
        <button
          key={title}
          onClick={action}
          title={title}
          style={{
            width: '32px',
            height: '32px',
            background: 'transparent',
            border: 'none',
            borderRadius: '4px',
            color: 'var(--color-text)',
            cursor: 'pointer',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
