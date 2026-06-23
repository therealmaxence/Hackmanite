'use client';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import GraphControls from '@/components/graph/GraphControls';
import LegendBar from '@/components/graph/LegendBar';
import GraphCanvas from '@/components/graph/GraphCanvas';
import EntityTableView from '@/components/graph/EntityTableView';
import NodePanel from '@/components/graph/NodePanel';
import MultiNodePanel from '@/components/graph/MultiNodePanel';
import CooccurrenceModal from '@/components/graph/CooccurrenceModal';
import Spinner from '@/components/ui/Spinner';
import { useEffect } from 'react';
import { useUploadStore } from '@/store/uploadStore';
import { useGraphStore } from '@/store/graphStore';
import { useProgressiveGraph } from '@/hooks/useProgressiveGraph';
import { useTranslation } from '@/lib/i18n';

export default function GraphClient() {
  const { sessionId } = useUploadStore();
  const { setFilter, isCooccurrenceModalOpen, activeView } = useGraphStore();
  const { t } = useTranslation();

  useEffect(() => {
    if (sessionId) {
      fetch(`/api/session/${sessionId}/settings`)
        .then((res) => res.ok && res.json())
        .then((data) => {
          if (data) {
            if (typeof data.minConnections === 'number') setFilter('minConnections', data.minConnections);
            if (typeof data.minOccurrences === 'number') setFilter('minOccurrences', data.minOccurrences);
            if (typeof data.minEdgeWeight === 'number') setFilter('minEdgeWeight', data.minEdgeWeight);
          }
        })
        .catch((err) => console.error('Failed to load session settings:', err));
    }
  }, [sessionId, setFilter]);

  const { loadedNodes, loadedEdges, totalCount, loadedCount, hasMore, isLoadingBatch, autoLoadDone, loadMore, expandNode } = useProgressiveGraph();
  const isEmpty = loadedNodes.length === 0 && !isLoadingBatch;

  return (
    <div className="graph-layout" style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}>
      <Header />
      <div className="graph-main" style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        <GraphControls />
        <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
          {isEmpty ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
              <Image src="/hackmanite_main_nobg.png" alt="Hackmanite" width={240} height={240} style={{ objectFit: 'contain', opacity: 0.15, userSelect: 'none', pointerEvents: 'none' }} draggable={false} />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', letterSpacing: '0.05em', textTransform: 'uppercase', opacity: 0.5 }}>{t('graph.empty_state')}</p>
            </div>
          ) : activeView === 'graph' ? (
            <div style={{ flex: 1, position: 'relative' }}><GraphCanvas nodes={loadedNodes} edges={loadedEdges} onNodeExpand={expandNode} /></div>
          ) : (
            <EntityTableView nodes={loadedNodes} />
          )}
          <NodePanel />
          <MultiNodePanel />
          {isCooccurrenceModalOpen && <CooccurrenceModal />}
        </div>
      </div>
      <LegendBar nodeCount={loadedNodes.length} edgeCount={loadedEdges.length}>
        <ProgressBar loadedCount={loadedCount} totalCount={totalCount} isLoadingBatch={isLoadingBatch} hasMore={hasMore} autoLoadDone={autoLoadDone} onLoadMore={loadMore} />
      </LegendBar>
    </div>
  );
}

function ProgressBar({ loadedCount, totalCount, isLoadingBatch, hasMore, autoLoadDone, onLoadMore }: { loadedCount: number; totalCount: number; isLoadingBatch: boolean; hasMore: boolean; autoLoadDone: boolean; onLoadMore: () => void; }) {
  const { t } = useTranslation();
  if (totalCount === 0) return null;
  const pct = Math.min(100, Math.round((loadedCount / totalCount) * 100)), done = !hasMore && !isLoadingBatch;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)', minWidth: 0 }}>
      <div style={{ width: 100, height: 3, background: 'var(--border-subtle, rgba(255,255,255,0.08))', borderRadius: 2, overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: done ? 'var(--color-success)' : 'var(--color-primary)', borderRadius: 2, transition: 'width 0.3s ease' }} />
      </div>
      {isLoadingBatch ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: 0.75 }}><Spinner size={11} />{t('graph.loading_nodes', { loaded: loadedCount.toLocaleString(), total: totalCount.toLocaleString() })}</span>
      ) : done ? (
        <span style={{ opacity: 0.5 }}>{t('graph.nodes_count', { loaded: loadedCount.toLocaleString(), total: totalCount.toLocaleString() })}</span>
      ) : (
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ opacity: 0.5 }}>{t('graph.nodes_count', { loaded: loadedCount.toLocaleString(), total: totalCount.toLocaleString() })}</span>
          {hasMore && autoLoadDone && (
            <button
              id="load-more-btn" onClick={onLoadMore}
              style={{ padding: '2px 10px', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.04em', background: 'transparent', border: '1px solid var(--color-primary)', color: 'var(--color-primary-hover)', borderRadius: 4, cursor: 'pointer', transition: 'background 0.15s, color 0.15s' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-primary)'; e.currentTarget.style.color = 'var(--color-on-primary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-primary-hover)'; }}
            >
              {t('graph.load_more_btn')}
            </button>
          )}
        </span>
      )}
    </div>
  );
}
