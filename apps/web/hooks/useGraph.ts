'use client';

import { useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { useUploadStore } from '@/store/uploadStore';
import { useGraphStore } from '@/store/graphStore';
import { ENTITY_COLORS } from '@/types/entities';
import type { GraphNode, GraphEdge } from '@/lib/graph-builder';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useGraph() {
  const { sessionId } = useUploadStore();
  const { setNodes, setEdges, setLoading, filters } = useGraphStore();

  const typeParam = filters.entityTypes.join(',');
  const fromParam = filters.dateRange.from ? filters.dateRange.from.toISOString() : '';
  const toParam = filters.dateRange.to ? filters.dateRange.to.toISOString() : '';

  const { data: nodeData, isLoading: nodesLoading } = useSWR(
    sessionId ? `/api/graph/nodes?sessionId=${sessionId}&types=${typeParam}&from=${encodeURIComponent(fromParam)}&to=${encodeURIComponent(toParam)}&limit=500` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: edgeData, isLoading: edgesLoading } = useSWR(
    sessionId ? `/api/graph/edges?sessionId=${sessionId}&from=${encodeURIComponent(fromParam)}&to=${encodeURIComponent(toParam)}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const isLoading = nodesLoading || edgesLoading;

  useEffect(() => {
    setLoading(isLoading);
  }, [isLoading, setLoading]);

  const nodes: GraphNode[] = useMemo(() => 
    (nodeData?.nodes ?? []).map((n: any) => ({
      ...n,
      color: ENTITY_COLORS[n.type as keyof typeof ENTITY_COLORS] || '#6b7280',
    })),
    [nodeData]
  );

  const edges: GraphEdge[] = useMemo(() => {
    const nodeIds = new Set(nodes.map(n => n.id));
    return (edgeData?.edges ?? [])
      .filter((e: any) => nodeIds.has(e.source) && nodeIds.has(e.target))
      .map((e: any) => ({ source: e.source, target: e.target, weight: e.weight }));
  }, [edgeData, nodes]);

  useEffect(() => {
    if (nodeData?.nodes) setNodes(nodes);
    if (edgeData?.edges) setEdges(edges);
  }, [nodeData, edgeData, nodes, edges, setNodes, setEdges]);

  return { nodes, edges, isLoading };
}
