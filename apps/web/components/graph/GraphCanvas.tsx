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
import ModifyNodeModal from './ModifyNodeModal';
import ZoomControls from '@/components/ui/ZoomControls';

if (typeof window !== 'undefined') {
  cytoscape.use(coseBilkent);
}

interface GraphCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeExpand?: (nodeId: string) => void;
  isStandalone?: boolean;
  overrideFilters?: any;
}

export default function GraphCanvas({
  nodes,
  edges,
  onNodeExpand,
  isStandalone = false,
  overrideFilters,
}: GraphCanvasProps) {
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

  const [editingNode, setEditingNode] = useState<{ id: string; type: string } | null>(null);

  const renderedNodeIds = useRef<Set<string>>(new Set());
  const renderedEdgeKeys = useRef<Set<string>>(new Set());

  const store = useGraphStore();
  const filters = isStandalone
    ? (overrideFilters || { searchQuery: '', minConnections: 0, minOccurrences: 0, minTfidf: 0, minEdgeWeight: 0, entityTypes: [] })
    : store.filters;
  const selectedNodeId = isStandalone ? null : store.selectedNodeId;
  const selectedNodeIds = isStandalone ? [] : store.selectedNodeIds;
  const layout = isStandalone ? 'cose-bilkent' : store.layout;
  const layoutTrigger = isStandalone ? 0 : store.layoutTrigger;
  const { selectNode, removeNode, togglePanel, changeNodeType } = store;

  const { sessionId } = useUploadStore();
  const { mutate } = useSWRConfig();

  const cyInstance = useCytoscapeInit({
    containerRef,
    onNodeExpand,
    renderedNodeIds,
    renderedEdgeKeys,
    onNodeRightClick: (nodeId, nodeType, nodeLabel, x, y) => {
      if (isStandalone) return;
      setContextMenu({ visible: true, x, y, nodeId, nodeType, nodeLabel });
    },
    onCanvasTap: () => {
      setContextMenu(null);
    },
    isStandalone,
  });

  const zoomIn = () => {
    if (cyInstance && !cyInstance.destroyed()) {
      cyInstance.zoom(cyInstance.zoom() * 1.2);
    }
  };
  const zoomOut = () => {
    if (cyInstance && !cyInstance.destroyed()) {
      cyInstance.zoom(cyInstance.zoom() / 1.2);
    }
  };
  const fitGraph = () => {
    if (cyInstance && !cyInstance.destroyed()) {
      cyInstance.fit(undefined, 40);
    }
  };

  useEffect(() => {
    if (!cyInstance) return;
    const timer = setTimeout(() => {
      if (cyInstance && !cyInstance.destroyed()) {
        cyInstance.resize();
        cyInstance.fit();
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [cyInstance]);

  useEffect(() => {
    if (!cyInstance || !containerRef.current) return;
    const obs = new ResizeObserver(() => !cyInstance.destroyed() && cyInstance.resize());
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [cyInstance]);



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

  const handleModifyNode = (id: string) => {
    const node = nodes.find((n) => n.id === id);
    if (node) {
      setEditingNode({ id, type: node.type });
    }
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
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div
        ref={containerRef}
        id="cy"
        style={{ width: '100%', height: '100%', background: 'var(--bg-base)' }}
      />
      <ZoomControls onZoomIn={zoomIn} onZoomOut={zoomOut} onFit={fitGraph} />
      <GraphSelectionTip />
      {contextMenu && contextMenu.visible && (
        <GraphContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeId={contextMenu.nodeId}
          nodeType={contextMenu.nodeType}
          nodeLabel={contextMenu.nodeLabel}
          onCopyName={handleCopyName}
          onChangeType={handleChangeNodeType}
          onHideNode={handleHideNode}
          onDeleteNode={handleDeleteNode}
          onModifyNode={handleModifyNode}
        />
      )}
      {editingNode && (
        <ModifyNodeModal
          nodeId={editingNode.id}
          nodeType={editingNode.type}
          sessionId={sessionId!}
          onClose={() => setEditingNode(null)}
          onSaveSuccess={(newId) => {
            if (newId && selectedNodeId === editingNode.id) {
              selectNode(newId);
            }
          }}
        />
      )}
    </div>
  );
}
