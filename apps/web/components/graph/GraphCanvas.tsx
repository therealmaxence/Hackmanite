'use client';

import { useRef, useMemo } from 'react';
import cytoscape from 'cytoscape';
// @ts-expect-error — no types for cose-bilkent
import coseBilkent from 'cytoscape-cose-bilkent';
import { useGraphStore } from '@/store/graphStore';
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

  const renderedNodeIds = useRef<Set<string>>(new Set());
  const renderedEdgeKeys = useRef<Set<string>>(new Set());

  const {
    filters,
    selectedNodeId,
    selectedNodeIds,
    layout,
    layoutTrigger,
  } = useGraphStore();

  const cy = useCytoscapeInit({
    containerRef,
    onNodeExpand,
    renderedNodeIds,
    renderedEdgeKeys,
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

  return (
    <div
      ref={containerRef}
      id="cy"
      style={{ width: '100%', height: '100%', background: 'var(--bg-base)' }}
    />
  );
}
