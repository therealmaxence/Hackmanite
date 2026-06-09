'use client';

import { useEffect } from 'react';
import useSWR from 'swr';
import { useUploadStore } from '@/store/uploadStore';
import { useGraphStore } from '@/store/graphStore';
import { ENTITY_COLORS } from '@/types/entities';
import type { EntityType } from '@/types/entities';
import type { GraphNode, GraphEdge } from '@/lib/graph-builder';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useGraph() {
  const { sessionId } = useUploadStore();
  const { setNodes, setEdges, setLoading, filters } = useGraphStore();

  const typeParam = filters.entityTypes.join(',');
  const fromParam = filters.dateRange.from ? filters.dateRange.from.toISOString() : '';
  const toParam = filters.dateRange.to ? filters.dateRange.to.toISOString() : '';

  // Fetch nodes
  const { data: nodeData, isLoading: nodesLoading } = useSWR(
    sessionId
      ? `/api/graph/nodes?sessionId=${sessionId}&types=${typeParam}&from=${encodeURIComponent(fromParam)}&to=${encodeURIComponent(toParam)}&limit=500`
      : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  // Fetch edges
  const { data: edgeData, isLoading: edgesLoading } = useSWR(
    sessionId
      ? `/api/graph/edges?sessionId=${sessionId}&from=${encodeURIComponent(fromParam)}&to=${encodeURIComponent(toParam)}`
      : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const isLoading = nodesLoading || edgesLoading;

  // Sync loading state
  useEffect(() => {
    setLoading(isLoading);
  }, [isLoading, setLoading]);

  const nodes: GraphNode[] = (nodeData?.nodes ?? []).map(
    (n: { id: string; label: string; type: EntityType | "FILE"; fileCount: number; totalOccurrences: number; tfidf?: number }) => ({
      id: n.id,
      label: n.label,
      type: n.type,
      fileCount: n.fileCount,
      totalOccurrences: n.totalOccurrences,
      tfidf: n.tfidf,
      color: ENTITY_COLORS[n.type] || '#6b7280',
    })
  );

  const nodeIds = new Set(nodes.map(n => n.id));

  const edges: GraphEdge[] = (edgeData?.edges ?? [])
    .filter((e: { source: string; target: string }) => nodeIds.has(e.source) && nodeIds.has(e.target))
    .map(
      (e: { source: string; target: string; weight: number }) => ({
        source: e.source,
        target: e.target,
        weight: e.weight,
      })
    );

  // Synchronize state with Zustand store
  useEffect(() => {
    if (nodeData?.nodes) {
      setNodes(nodes);
    }
  }, [nodeData, setNodes]);

  useEffect(() => {
    if (edgeData?.edges) {
      setEdges(edges);
    }
  }, [edgeData, setEdges]);

  return { nodes, edges, isLoading };
}
