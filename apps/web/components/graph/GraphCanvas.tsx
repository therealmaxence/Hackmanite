'use client';

import { useRef, useMemo, useState, useEffect } from 'react';
import cytoscape from 'cytoscape';
// @ts-expect-error — no types for cose-bilkent
import coseBilkent from 'cytoscape-cose-bilkent';
import { useGraphStore } from '@/store/graphStore';
import { useUploadStore } from '@/store/uploadStore';
import { useSWRConfig } from 'swr';
import { useTranslation } from '@/lib/i18n';
import { GraphNode, GraphEdge } from '@/lib/graph-builder';
import { computeGraphCommunities } from '@/lib/graphCommunities';
import { ENTITY_COLORS, EntityType } from '@/types/entities';

import { useCytoscapeInit } from './hooks/useCytoscapeInit';
import { useCytoscapeElements } from './hooks/useCytoscapeElements';
import { useCytoscapeLayout } from './hooks/useCytoscapeLayout';
import { useCytoscapeSelection } from './hooks/useCytoscapeSelection';
import { useCytoscapeHighlights } from './hooks/useCytoscapeHighlights';
import GraphSelectionTip from './GraphSelectionTip';
import GraphContextMenu from './GraphContextMenu';

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
  const { t } = useTranslation();
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
    addCooccurrenceNodeId,
    setCooccurrenceModalOpen,
    changeNodeType,
    isPanelOpen,
  } = useGraphStore();

  const { sessionId } = useUploadStore();
  const { mutate } = useSWRConfig();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);


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

  const cyInstance = useCytoscapeInit({
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

  useEffect(() => {
    if (!cyInstance) return;
    const timer = setTimeout(() => {
      if (cyInstance && !cyInstance.destroyed()) {
        cyInstance.resize();
        cyInstance.fit();
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [isFullscreen, cyInstance]);

  useCytoscapeElements({
    cy: cyInstance,
    nodes,
    edges,
    renderedNodeIds,
    renderedEdgeKeys,
  });

  useCytoscapeLayout({
    cy: cyInstance,
    nodesCount: nodes.length,
    layout,
    layoutTrigger,
  });

  useCytoscapeSelection({
    cy: cyInstance,
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
    cy: cyInstance,
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
      ? t('graph.panel.confirm_delete_file', { name: label })
      : t('graph.panel.confirm_delete_entity', { name: label });

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

  const handleHideNode = async (id: string, label: string) => {
    try {
      const getRes = await fetch(`/api/session/${sessionId}/settings`);
      if (!getRes.ok) throw new Error('Failed to fetch session settings');
      const settings = await getRes.json();
      
      const hiddenIds: string[] = JSON.parse(settings.hiddenNodeIds || '[]');
      if (!hiddenIds.includes(id)) {
        hiddenIds.push(id);
      }

      const postRes = await fetch(`/api/session/${sessionId}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hiddenNodeIds: JSON.stringify(hiddenIds),
        }),
      });
      if (!postRes.ok) throw new Error('Failed to update hidden nodes');

      removeNode(id);
      if (selectedNodeId === id || selectedNodeIds.includes(id)) {
        togglePanel(false);
        selectNode(null);
      }
      setContextMenu(null);

      mutate((key: unknown) => typeof key === 'string' && (key.includes('/api/graph/') || key.includes('/api/stats')));
    } catch (err) {
      console.error('Failed to hide node', err);
    }
  };

  const handleCopyName = (label: string) => {
    navigator.clipboard?.writeText(label).catch(() => {});
    setContextMenu(null);
  };

  const handleChangeNodeType = async (id: string, newType: string) => {
    try {
      setContextMenu(null);
      const res = await fetch(`/api/entities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: newType, sessionId }),
      });
      if (!res.ok) throw new Error('Failed to update node type on server');
      const data = await res.json();
      const newColor = ENTITY_COLORS[newType as EntityType] || '#6b7280';
      changeNodeType(id, data.newId, newType as EntityType, newColor);
      mutate((key: unknown) => typeof key === 'string' && (key.includes('/api/graph/') || key.includes('/api/stats')));
    } catch (err) {
      console.error('Failed to change node type', err);
    }
  };

  return (
    <div
      ref={wrapperRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
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
      <div
        ref={containerRef}
        id="cy"
        style={{ width: '100%', height: '100%', background: 'var(--bg-base)' }}
      />
      {(!isPanelOpen || isFullscreen) && (
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
      )}
      <GraphSelectionTip />
      {contextMenu && contextMenu.visible && (
        <GraphContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeId={contextMenu.nodeId}
          nodeType={contextMenu.nodeType}
          nodeLabel={contextMenu.nodeLabel}
          onCopyName={handleCopyName}
          onSearchCooccurrence={(id) => {
            addCooccurrenceNodeId(id);
            setCooccurrenceModalOpen(true);
            setContextMenu(null);
          }}
          onChangeType={handleChangeNodeType}
          onHideNode={handleHideNode}
          onDeleteNode={handleDeleteNode}
        />
      )}
    </div>
  );
}
