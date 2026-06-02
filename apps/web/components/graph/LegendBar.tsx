'use client';

import { ReactNode } from 'react';
import EntityFilterBar from '@/components/shared/EntityFilterBar';

export default function LegendBar({
  nodeCount,
  edgeCount,
  children,
}: {
  nodeCount?: number;
  edgeCount?: number;
  children?: ReactNode;
}) {
  return (
    <div
      className="legend-bar"
      style={{
        height: 60,
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 2.5rem',
        gap: '2rem',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* Stats */}
      {(nodeCount !== undefined || edgeCount !== undefined) && (
        <>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
            {nodeCount ?? 0}N · {edgeCount ?? 0}E
          </span>
          <div style={{ width: 1, height: 24, background: 'var(--border)', flexShrink: 0 }} />
        </>
      )}

      {/* Entity type toggles */}
      <EntityFilterBar className="entity-filter-shell flex-1" />

      {/* Progressive loading progress bar (injected by GraphClient) */}
      {children && (
        <>
          <div style={{ width: 1, height: 24, background: 'var(--border)', flexShrink: 0 }} />
          {children}
        </>
      )}
    </div>
  );
}
