'use client';

import useSWR, { useSWRConfig } from 'swr';
import { useUploadStore } from '@/store/uploadStore';
import { useGraphStore } from '@/store/graphStore';
import { ENTITY_COLORS, EntityType } from '@/types/entities';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import FileNodePanel from './FileNodePanel';
import EntityNodePanel from './EntityNodePanel';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function NodePanel() {
  const { selectedNodeId, isPanelOpen, togglePanel, nodes, selectNode, removeNode } = useGraphStore();
  const { sessionId } = useUploadStore();
  const { mutate } = useSWRConfig();

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const isFile = selectedNode?.type === 'FILE';

  const { data, isLoading } = useSWR(
    selectedNodeId && sessionId
      ? isFile
        ? `/api/files/${selectedNodeId}`
        : `/api/entities/${selectedNodeId}?sessionId=${sessionId}`
      : null,
    fetcher
  );

  if (!isPanelOpen || !selectedNodeId) return null;

  const invalidateGraph = () => {
    mutate((key: unknown) => typeof key === 'string' && key.includes('/api/graph/'));
  };

  const handleDeleteFile = async () => {
    if (!confirm(`Permanently remove file "${data?.originalName}" and all its extracted entities from this session's graph?`)) return;
    try {
      // Optimistic: remove the file node and its edges locally right away
      removeNode(selectedNodeId);
      togglePanel(false);
      selectNode(null);
      const res = await fetch(`/api/files/${selectedNodeId}`, { method: 'DELETE' });
      if (!res.ok) console.error('Failed to delete file from server');
      // Invalidate SWR cache so future fetches are fresh — no full reload needed
      invalidateGraph();
    } catch (err) {
      console.error('Failed to delete file', err);
    }
  };

  const handleDeleteEntity = async () => {
    if (!confirm(`Remove "${data?.displayName}" from this session's graph?`)) return;
    try {
      // Optimistic: remove the entity node and its edges locally right away
      removeNode(selectedNodeId);
      togglePanel(false);
      selectNode(null);
      const res = await fetch(`/api/entities/${selectedNodeId}?sessionId=${sessionId}`, { method: 'DELETE' });
      if (!res.ok) console.error('Failed to delete entity from server');
      // Invalidate SWR cache so future fetches are fresh — no full reload needed
      invalidateGraph();
    } catch (err) {
      console.error('Failed to delete node', err);
    }
  };

  return (
    <div
      className="node-panel animate-slide-in"
      style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 'clamp(400px, 45vw, 650px)', background: 'var(--color-surface)', borderLeft: 'none', display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 10, transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)' }}
    >
      <div style={{ padding: '1.5rem 2rem', background: 'var(--color-surface-raised)', display: 'flex', alignItems: 'flex-start', gap: '1.25rem' }}>
        {data && (
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: isFile ? ENTITY_COLORS.FILE : (ENTITY_COLORS[data.type as EntityType] || 'var(--accent)'), marginTop: 4, flexShrink: 0 }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          {isLoading ? <Spinner size={16} /> : (
            <>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'break-all', marginBottom: '0.5rem', lineHeight: 1.3 }}>
                {isFile ? data?.originalName : (data?.displayName || '—')}
              </h3>
              {data && <Badge entityType={(isFile ? 'FILE' : data.type) as EntityType} size="sm">{isFile ? 'FILE' : data.type}</Badge>}
            </>
          )}
        </div>
        <button
          id="close-node-panel"
          onClick={() => togglePanel(false)}
          aria-label="Close details panel"
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 8, minWidth: 44, minHeight: 44, borderRadius: 'var(--radius-sm)', lineHeight: 1, fontSize: '1.3rem', transition: 'color 0.2s' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          ×
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '2rem' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Spinner /></div>
        ) : data ? (
          isFile ? (
            <FileNodePanel data={data} fileId={selectedNodeId} onSelectNode={selectNode} onDelete={handleDeleteFile} />
          ) : (
            <EntityNodePanel
              data={data}
              totalOccurrences={selectedNode?.totalOccurrences ?? data.files?.reduce((acc: number, f: { count: number }) => acc + f.count, 0) ?? 0}
              tfidf={selectedNode?.tfidf}
              sessionId={sessionId!}
              onSelectNode={selectNode}
              onDelete={handleDeleteEntity}
            />
          )
        ) : (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Entity not found</p>
        )}
      </div>
    </div>
  );
}
