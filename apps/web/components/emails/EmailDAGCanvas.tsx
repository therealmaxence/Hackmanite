'use client';

import { useRef, useCallback } from 'react';
import { EmailNodeData, LayoutType } from './types';
import { useEmailGraph } from './hooks/useEmailGraph';

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

  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
      {/* Cytoscape mount target */}
      <div ref={containerRef} style={{ width: '100%', height: '100%', background: 'var(--bg-base)' }} />

      {/* Floating zoom controls */}
      <div
        style={{
          position: 'absolute',
          top: '1rem',
          left: '1rem',
          background: 'rgba(10, 12, 16, 0.8)',
          backdropFilter: 'blur(10px)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius)',
          padding: '6px',
          display: 'flex',
          gap: '4px',
          zIndex: 50,
        }}
      >
        {[
          { label: 'Fit', title: 'Fit Graph', action: fitGraph },
          { label: '+', title: 'Zoom In',  action: zoomIn  },
          { label: '-', title: 'Zoom Out', action: zoomOut },
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
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div
        style={{
          position: 'absolute',
          bottom: '1rem',
          left: '1rem',
          background: 'rgba(10, 12, 16, 0.7)',
          backdropFilter: 'blur(6px)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius)',
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '0.6875rem',
          color: 'var(--color-text-muted)',
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-secondary)', display: 'inline-block' }} />
          <span>Email node (by sender)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '14px', height: '2px', background: '#2C3545', display: 'inline-block' }} />
          <span>Reply flow</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '14px', height: '0px', borderTop: '2px dashed #EC4899', display: 'inline-block' }} />
          <span>Forward flow</span>
        </div>
      </div>
    </div>
  );
}
