'use client';

import { useRef, useMemo, useState } from 'react';
import cytoscape from 'cytoscape';
// @ts-expect-error — no types for cose-bilkent
import coseBilkent from 'cytoscape-cose-bilkent';
import { useGraphStore } from '@/store/graphStore';
import { useUploadStore } from '@/store/uploadStore';
import { useSWRConfig } from 'swr';
import { GraphNode, GraphEdge } from '@/lib/graph-builder';
import { computeGraphCommunities } from '@/lib/graphCommunities';

import { useCytoscapeInit } from './hooks/useCytoscapeInit';
import { useCytoscapeElements } from './hooks/useCytoscapeElements';
import { useCytoscapeLayout } from './hooks/useCytoscapeLayout';
import { useCytoscapeSelection } from './hooks/useCytoscapeSelection';
import { useCytoscapeHighlights } from './hooks/useCytoscapeHighlights';

if (typeof window !== 'undefined') {
  cytoscape.use(coseBilkent);
}

interface GraphCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeExpand?: (nodeId: string) => void;
}

export default function GraphCanvas({ nodes, edges, onNodeExpand }: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    nodeId: string;
    nodeType: string;
    nodeLabel: string;
  } | null>(null);

  const renderedNodeIds = useRef<Set<string>>(new Set());
  const renderedEdgeKeys = useRef<Set<string>>(new Set());

  const {
    filters,
    selectedNodeId,
    selectedNodeIds,
    layout,
    layoutTrigger,
    removeNode,
    togglePanel,
    selectNode,
  } = useGraphStore();

  const { sessionId } = useUploadStore();
  const { mutate } = useSWRConfig();

  const cy = useCytoscapeInit({
    containerRef,
    onNodeExpand,
    renderedNodeIds,
    renderedEdgeKeys,
    onNodeRightClick: (nodeId, nodeType, nodeLabel, x, y) => {
      setContextMenu({ visible: true, x, y, nodeId, nodeType, nodeLabel });
    },
    onCanvasTap: () => {
      setContextMenu(null);
    },
  });

  useCytoscapeElements({
    cy,
    nodes,
    edges,
    layout,
    renderedNodeIds,
    renderedEdgeKeys,
  });

  useCytoscapeLayout({
    cy,
    nodesCount: nodes.length,
    layout,
    layoutTrigger,
  });

  useCytoscapeSelection({
    cy,
    selectedNodeIds,
  });

  const adjacency = useMemo(() => {
    const adj = new Map<string, Set<string>>();
    for (const edge of edges) {
      if (!adj.has(edge.source)) adj.set(edge.source, new Set());
      if (!adj.has(edge.target)) adj.set(edge.target, new Set());
      adj.get(edge.source)!.add(edge.target);
      adj.get(edge.target)!.add(edge.source);
    }
    return adj;
  }, [edges]);

  const communityMap = useMemo(() => computeGraphCommunities(nodes, edges), [nodes, edges]);

  useCytoscapeHighlights({
    cy,
    nodes,
    edges,
    selectedNodeId,
    selectedNodeIds,
    filters,
    adjacency,
    communityMap,
  });

  const handleDeleteNode = async (id: string, type: string, label: string) => {
    const isFile = type === 'FILE';
    const confirmMessage = isFile
      ? `Permanently remove file "${label}" and all its extracted entities from this session's graph?`
      : `Remove "${label}" from this session's graph?`;

    if (!confirm(confirmMessage)) return;

    try {
      removeNode(id);
      if (selectedNodeId === id || selectedNodeIds.includes(id)) {
        togglePanel(false);
        selectNode(null);
      }
      setContextMenu(null);

      const url = isFile
        ? `/api/files/${id}`
        : `/api/entities/${id}?sessionId=${sessionId}`;
      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) console.error('Failed to delete node from server');

      mutate((key: unknown) => typeof key === 'string' && key.includes('/api/graph/'));
    } catch (err) {
      console.error('Failed to delete node', err);
    }
  };

  const handleCopyName = (label: string) => {
    navigator.clipboard?.writeText(label).catch(() => {});
    setContextMenu(null);
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div
        ref={containerRef}
        id="cy"
        style={{ width: '100%', height: '100%', background: 'var(--bg-base)' }}
      />
      {contextMenu && contextMenu.visible && (
        <div
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 1000,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(8px)',
            padding: '4px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            minWidth: '150px',
          }}
        >
          <button
            onClick={() => handleCopyName(contextMenu.nodeLabel)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text)',
              fontSize: '0.8rem',
              fontWeight: 500,
              padding: '6px 12px',
              textAlign: 'left',
              cursor: 'pointer',
              borderRadius: 'var(--radius-xs)',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            Copy Name
          </button>
          <button
            onClick={() => handleDeleteNode(contextMenu.nodeId, contextMenu.nodeType, contextMenu.nodeLabel)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-error)',
              fontSize: '0.8rem',
              fontWeight: 500,
              padding: '6px 12px',
              textAlign: 'left',
              cursor: 'pointer',
              borderRadius: 'var(--radius-xs)',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(238,50,84,0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
            Delete Node
          </button>
        </div>
      )}
    </div>
  );
}
