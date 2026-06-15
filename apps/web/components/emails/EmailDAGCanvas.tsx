'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import { EmailNodeData, LayoutType } from './types';
import { useEmailGraph } from './hooks/useEmailGraph';
import { useTranslation } from '@/lib/i18n';

interface EmailDAGCanvasProps {
  elements: Record<string, unknown>[];
  layoutType: LayoutType;
  onNodeSelect: (data: EmailNodeData) => void;
  onBackgroundTap: () => void;
  selectedEmailId: string | null;
}

export default function EmailDAGCanvas({
  elements,
  layoutType,
  onNodeSelect,
  onBackgroundTap,
  selectedEmailId,
}: EmailDAGCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { t } = useTranslation();

  const cyRef = useEmailGraph({
    containerRef,
    elements,
    layoutType,
    activeTab: 'graph',
    onNodeSelect,
    onBackgroundTap,
    selectedEmailId,
  });

  const zoomIn = useCallback(() => {
    const cy = cyRef.current;
    if (cy) cy.zoom(cy.zoom() * 1.2);
  }, [cyRef]);

  const zoomOut = useCallback(() => {
    const cy = cyRef.current;
    if (cy) cy.zoom(cy.zoom() / 1.2);
  }, [cyRef]);

  const fitGraph = useCallback(() => {
    cyRef.current?.fit(undefined, 40);
  }, [cyRef]);

  const toggleFullscreen = () => {
    if (!wrapperRef.current) return;
    if (!document.fullscreenElement) {
      wrapperRef.current.requestFullscreen?.()
        .then(() => setIsFullscreen(true))
        .catch(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    setIsFullscreen(!!document.fullscreenElement);

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const cy = cyRef.current;
    if (cy) {
      setTimeout(() => {
        cy.resize();
        cy.fit(undefined, 40);
      }, 150);
    }
  }, [isFullscreen, cyRef]);

  return (
    <div
      ref={wrapperRef}
      style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        ...(isFullscreen ? {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 9999,
        } : {}),
      }}
    >
      {/* Cytoscape mount target */}
      <div ref={containerRef} style={{ width: '100%', height: '100%', background: 'var(--bg-base)' }} />

      {/* Floating zoom controls */}
      <div
        style={{
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
        }}
      >
        {[
          { label: t('emails.canvas.fit'), title: t('emails.canvas.fit'), action: fitGraph },
          { label: '+', title: t('emails.canvas.zoom_in'),  action: zoomIn  },
          { label: '-', title: t('emails.canvas.zoom_out'), action: zoomOut },
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

      {/* Floating fullscreen control */}
      <button
        onClick={toggleFullscreen}
        title={isFullscreen ? t('graph.canvas.exit_fullscreen') : t('graph.canvas.fullscreen')}
        style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          zIndex: 50,
          width: '40px',
          height: '40px',
          borderRadius: 'var(--radius)',
          background: 'var(--color-surface-raised) var(--noise-bg)',
          border: 'none',
          color: 'var(--color-text)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-primary-hover)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text)'; }}
      >
        {isFullscreen ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
          </svg>
        )}
      </button>

      {/* Legend */}
      <div
        style={{
          position: 'absolute',
          bottom: '1rem',
          left: '1rem',
          background: 'var(--color-surface-raised) var(--noise-bg)',
          borderRadius: 'var(--radius)',
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '0.6875rem',
          color: 'var(--color-text-muted)',
          zIndex: 50,
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-secondary)', display: 'inline-block' }} />
          <span>{t('emails.canvas.node_desc')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '14px', height: '2px', background: '#2C3545', display: 'inline-block' }} />
          <span>{t('emails.canvas.reply_flow')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '14px', height: '0px', borderTop: '2px dashed #EC4899', display: 'inline-block' }} />
          <span>{t('emails.canvas.fwd_flow')}</span>
        </div>
      </div>
    </div>
  );
}
