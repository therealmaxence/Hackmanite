'use client';

import Image from 'next/image';
import Header from '@/components/layout/Header';
import GraphControls from '@/components/graph/GraphControls';
import LegendBar from '@/components/graph/LegendBar';
import GraphCanvas from '@/components/graph/GraphCanvas';
import NodePanel from '@/components/graph/NodePanel';
import MultiNodePanel from '@/components/graph/MultiNodePanel';
import Spinner from '@/components/ui/Spinner';
import { useEffect } from 'react';
import { useUploadStore } from '@/store/uploadStore';
import { useGraphStore } from '@/store/graphStore';
import { useProgressiveGraph } from '@/hooks/useProgressiveGraph';

export default function GraphClient() {
  const { sessionId } = useUploadStore();
  const { setFilter } = useGraphStore();

  useEffect(() => {
    if (sessionId) {
      fetch(`/api/session/${sessionId}/settings`)
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error('Failed to load session settings');
        })
        .then((data) => {
          if (data) {
            if (typeof data.minConnections === 'number') {
              setFilter('minConnections', data.minConnections);
            }
            if (typeof data.minOccurrences === 'number') {
              setFilter('minOccurrences', data.minOccurrences);
            }
            if (typeof data.minEdgeWeight === 'number') {
              setFilter('minEdgeWeight', data.minEdgeWeight);
            }
          }
        })
        .catch((err) => console.error('Failed to load session settings:', err));
    }
  }, [sessionId, setFilter]);

  const {
    loadedNodes,
    loadedEdges,
    totalCount,
    loadedCount,
    hasMore,
    isLoadingBatch,
    autoLoadDone,
    loadMore,
    expandNode,
  } = useProgressiveGraph();

  const isEmpty = loadedNodes.length === 0 && !isLoadingBatch;

  return (
    <div
      className="graph-layout"
      style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}
    >
      <Header />

      <div
        className="graph-main"
        style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}
      >
        <GraphControls />

        <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
          {isEmpty ? (
            /* Empty state */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
              <Image
                src="/dagex-nobg.png"
                alt="EntityGraph"
                width={240}
                height={240}
                style={{ objectFit: 'contain', opacity: 0.06, userSelect: 'none', pointerEvents: 'none' }}
                draggable={false}
              />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', letterSpacing: '0.05em', textTransform: 'uppercase', opacity: 0.5 }}>
                No entities yet — upload files first
              </p>
            </div>
          ) : (
            /* Graph canvas — always mounted once nodes exist, batches are added incrementally */
            <div style={{ flex: 1, position: 'relative' }}>
              <GraphCanvas
                nodes={loadedNodes}
                edges={loadedEdges}
                onNodeExpand={expandNode}
              />
            </div>
          )}

          <NodePanel />
          <MultiNodePanel />
        </div>
      </div>

      {/* ── Progressive loading bar ─────────────────────────────────────────── */}
      <LegendBar nodeCount={loadedNodes.length} edgeCount={loadedEdges.length}>
        <ProgressBar
          loadedCount={loadedCount}
          totalCount={totalCount}
          isLoadingBatch={isLoadingBatch}
          hasMore={hasMore}
          autoLoadDone={autoLoadDone}
          onLoadMore={loadMore}
        />
      </LegendBar>
    </div>
  );
}

// ─── Progress indicator ───────────────────────────────────────────────────────

interface ProgressBarProps {
  loadedCount: number;
  totalCount: number;
  isLoadingBatch: boolean;
  hasMore: boolean;
  autoLoadDone: boolean;
  onLoadMore: () => void;
}

function ProgressBar({
  loadedCount,
  totalCount,
  isLoadingBatch,
  hasMore,
  autoLoadDone,
  onLoadMore,
}: ProgressBarProps) {
  if (totalCount === 0) return null;

  const pct = totalCount > 0 ? Math.min(100, Math.round((loadedCount / totalCount) * 100)) : 0;
  const done = !hasMore && !isLoadingBatch;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        fontSize: '0.75rem',
        color: 'var(--text-secondary)',
        minWidth: 0,
      }}
    >
      {/* Thin progress track */}
      <div
        style={{
          width: 100,
          height: 3,
          background: 'var(--border-subtle, rgba(255,255,255,0.08))',
          borderRadius: 2,
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: done ? '#10b981' : 'var(--accent, #4c9ef0)',
            borderRadius: 2,
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {isLoadingBatch ? (
        /* Subtle spinner + text while a batch is in flight */
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: 0.75 }}>
          <Spinner size={11} />
          Loading nodes… {loadedCount.toLocaleString()} / {totalCount.toLocaleString()}
        </span>
      ) : done ? (
        <span style={{ opacity: 0.5 }}>
          {loadedCount.toLocaleString()} / {totalCount.toLocaleString()} nodes
        </span>
      ) : (
        /* Auto-loading paused — show "Load more" button */
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ opacity: 0.5 }}>
            {loadedCount.toLocaleString()} / {totalCount.toLocaleString()}
          </span>
          {hasMore && autoLoadDone && (
            <button
              id="load-more-btn"
              onClick={onLoadMore}
              style={{
                padding: '2px 10px',
                fontSize: '0.7rem',
                fontWeight: 600,
                letterSpacing: '0.04em',
                background: 'transparent',
                border: '1px solid var(--accent, #4c9ef0)',
                color: 'var(--accent, #4c9ef0)',
                borderRadius: 4,
                cursor: 'pointer',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent, #4c9ef0)';
                (e.currentTarget as HTMLButtonElement).style.color = '#0a0c10';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent, #4c9ef0)';
              }}
            >
              Load more
            </button>
          )}
        </span>
      )}
    </div>
  );
}
