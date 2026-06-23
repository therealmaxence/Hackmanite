'use client';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import GraphControls from '@/components/graph/GraphControls';
import LegendBar from '@/components/graph/LegendBar';
import GraphCanvas from '@/components/graph/GraphCanvas';
import EntityTableView from '@/components/graph/EntityTableView';
import NodePanel from '@/components/graph/NodePanel';
import MultiNodePanel from '@/components/graph/MultiNodePanel';
import Spinner from '@/components/ui/Spinner';
import { useEffect, useState } from 'react';
import { useUploadStore } from '@/store/uploadStore';
import { useGraphStore } from '@/store/graphStore';
import { useProgressiveGraph } from '@/hooks/useProgressiveGraph';
import { useTranslation } from '@/lib/i18n';

export default function GraphClient() {
  const { sessionId } = useUploadStore();
  const { setFilter, activeView } = useGraphStore();
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

  const { loadedNodes, loadedEdges, totalCount, loadedCount, isLoadingBatch, expandNode, setLoadedLimit } = useProgressiveGraph();
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
        </div>
      </div>
      <LegendBar nodeCount={loadedNodes.length} edgeCount={loadedEdges.length}>
        <ProgressBar loadedCount={loadedCount} totalCount={totalCount} isLoadingBatch={isLoadingBatch} setLoadedLimit={setLoadedLimit} />
      </LegendBar>
    </div>
  );
}

function ProgressBar({
  loadedCount,
  totalCount,
  isLoadingBatch,
  setLoadedLimit,
}: {
  loadedCount: number;
  totalCount: number;
  isLoadingBatch: boolean;
  setLoadedLimit: (targetCount: number) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(String(loadedCount));

  useEffect(() => {
    if (!isEditing) {
      setInputValue(String(loadedCount));
    }
  }, [loadedCount, isEditing]);

  if (totalCount === 0) return null;

  const handleCommit = () => {
    const val = parseInt(inputValue);
    if (!isNaN(val) && val > 0 && val <= totalCount) {
      setLoadedLimit(val);
    } else {
      setInputValue(String(loadedCount));
    }
    setIsEditing(false);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem', color: 'var(--color-text-muted)', minWidth: 0 }}>
      <input
        type="range"
        min={1}
        max={totalCount}
        value={loadedCount}
        disabled={isLoadingBatch}
        onChange={(e) => {
          const val = Number(e.target.value);
          setLoadedLimit(val);
        }}
        style={{
          width: '130px',
          height: '4px',
          borderRadius: '2px',
          background: 'var(--color-border)',
          outline: 'none',
          cursor: isLoadingBatch ? 'not-allowed' : 'pointer',
          accentColor: 'var(--color-primary)',
          opacity: isLoadingBatch ? 0.5 : 1,
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap' }}>
        {isEditing ? (
          <input
            type="number"
            min={1}
            max={totalCount}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={handleCommit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCommit();
              if (e.key === 'Escape') {
                setInputValue(String(loadedCount));
                setIsEditing(false);
              }
            }}
            autoFocus
            style={{
              width: '55px',
              background: 'var(--color-surface-raised)',
              border: '1px solid var(--color-primary)',
              color: 'var(--color-text)',
              borderRadius: 'var(--radius-sm)',
              padding: '2px 6px',
              fontSize: '0.75rem',
              outline: 'none',
            }}
          />
        ) : (
          <span
            onClick={() => {
              if (!isLoadingBatch) {
                setInputValue(String(loadedCount));
                setIsEditing(true);
              }
            }}
            style={{
              cursor: isLoadingBatch ? 'not-allowed' : 'pointer',
              borderBottom: '1px dashed var(--color-primary)',
              color: 'var(--color-primary-hover)',
              fontWeight: 600,
              fontSize: '0.75rem',
              padding: '0 2px',
            }}
            title="Click to manually enter precise node count"
          >
            {loadedCount.toLocaleString()}
          </span>
        )}
        <span style={{ opacity: 0.5 }}>/ {totalCount.toLocaleString()} nodes loaded</span>
      </div>

      {isLoadingBatch && (
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', opacity: 0.8 }}>
          <Spinner size={10} />
        </span>
      )}
    </div>
  );
}
