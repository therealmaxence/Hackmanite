'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useUploadStore } from '@/store/uploadStore';
import { useGraphStore } from '@/store/graphStore';
import { ENTITY_COLORS } from '@/types/entities';
import type { EntityType } from '@/types/entities';
import type { GraphNode, GraphEdge } from '@/lib/graph-builder';


/** Number of nodes fetched per HTTP request */
const BATCH_SIZE = 100;

/** Delay between automatic batch loads (ms). Gives the layout engine time to settle. */
const AUTO_LOAD_DELAY_MS = 300;

/**
 * After this many auto-loaded batches we stop and show a "Load more" button
 * rather than flooding the browser with 50k nodes automatically.
 */
const AUTO_STOP_AFTER_BATCHES = 1;


export interface ProgressiveGraphState {
  loadedNodes: GraphNode[];
  loadedEdges: GraphEdge[];
  totalCount: number;
  loadedCount: number;
  hasMore: boolean;
  isLoadingBatch: boolean;
  autoLoadDone: boolean;
  loadMore: () => void;
  expandNode: (nodeId: string) => void;
}

export function useProgressiveGraph(): ProgressiveGraphState {
  const { sessionId } = useUploadStore();
  const { filters, setNodes, setEdges, refreshTrigger } = useGraphStore();

  const [loadedNodes, setLoadedNodes] = useState<GraphNode[]>([]);
  const [loadedEdges, setLoadedEdges] = useState<GraphEdge[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingBatch, setIsLoadingBatch] = useState(false);
  const [autoLoadDone, setAutoLoadDone] = useState(false);

  useEffect(() => {
    setNodes(loadedNodes);
  }, [loadedNodes, setNodes]);

  useEffect(() => {
    setEdges(loadedEdges);
  }, [loadedEdges, setEdges]);

  const graphNodes = useGraphStore((s) => s.nodes);
  useEffect(() => {
    const graphNodeIds = new Set(graphNodes.map((n) => n.id));
    const removed = Array.from(loadedNodeIdsRef.current).filter((id) => !graphNodeIds.has(id));
    if (removed.length === 0) return;
    for (const id of removed) loadedNodeIdsRef.current.delete(id);
    for (const key of Array.from(loadedEdgeKeysRef.current)) {
      const [src, tgt] = key.split('|');
      if (removed.includes(src) || removed.includes(tgt)) {
        loadedEdgeKeysRef.current.delete(key);
      }
    }
    setLoadedNodes((prev) => prev.filter((n) => !removed.includes(n.id)));
    setLoadedEdges((prev) => prev.filter((e) => !removed.includes(e.source) && !removed.includes(e.target)));
  }, [graphNodes]);

  const offsetRef = useRef(0);
  const batchCountRef = useRef(0);
  const loadedNodeIdsRef = useRef<Set<string>>(new Set());
  const loadedEdgeKeysRef = useRef<Set<string>>(new Set());
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionIdRef = useRef(sessionId);
  const filtersRef = useRef(filters);

  sessionIdRef.current = sessionId;
  filtersRef.current = filters;

  const typeParam = filters.entityTypes.join(',');

  const mergeNewData = useCallback(
    (newNodes: GraphNode[], newEdges: GraphEdge[]) => {
      const addedNodes: GraphNode[] = [];
      for (const n of newNodes) {
        if (!loadedNodeIdsRef.current.has(n.id)) {
          loadedNodeIdsRef.current.add(n.id);
          addedNodes.push(n);
        }
      }

      const addedEdges: GraphEdge[] = [];
      for (const e of newEdges) {
        const key = `${e.source}|${e.target}`;
        const keyRev = `${e.target}|${e.source}`;
        if (!loadedEdgeKeysRef.current.has(key) && !loadedEdgeKeysRef.current.has(keyRev)) {
          loadedEdgeKeysRef.current.add(key);
          addedEdges.push(e);
        }
      }

      if (addedNodes.length > 0) {
        setLoadedNodes((prev) => [...prev, ...addedNodes]);
      }
      if (addedEdges.length > 0) {
        setLoadedEdges((prev) => [...prev, ...addedEdges]);
      }
    },
    []
  );

  const fetchBatch = useCallback(async () => {
    const sid = sessionIdRef.current;
    if (!sid) return;

    setIsLoadingBatch(true);
    try {
      const offset = offsetRef.current;
      const from = filtersRef.current.dateRange.from ? filtersRef.current.dateRange.from.toISOString() : '';
      const to = filtersRef.current.dateRange.to ? filtersRef.current.dateRange.to.toISOString() : '';

      const params = new URLSearchParams({
        sessionId: sid,
        limit: String(BATCH_SIZE),
        offset: String(offset),
        types: filtersRef.current.entityTypes.join(','),
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
      });

      const res = await fetch(`/api/graph/nodes?${params}`);
      if (!res.ok) return;
      const data = await res.json();

      let weakNodes: GraphNode[] = [];
      if (offset === 0 && filtersRef.current.showWeakSignals) {
        try {
          const wsRes = await fetch(`/api/stats/weak-signals?sessionId=${sid}`);
          if (wsRes.ok) {
            const wsData = await wsRes.json();
            const rawWeak = [
              ...(wsData.bridgeSignals || []),
              ...(wsData.nicheSignals || []),
              ...(wsData.emergingSignals || []),
            ];
            const uniqueWeak = Array.from(new Map(rawWeak.map(w => [w.id, w])).values());
            weakNodes = uniqueWeak.map(w => ({
              id: w.id,
              label: w.label,
              type: w.type as EntityType,
              fileCount: w.fileCount,
              totalOccurrences: w.totalCount,
              tfidf: w.score,
              color: ENTITY_COLORS[w.type as EntityType] || '#6b7280',
              isWeakSignal: true,
            }));
          }
        } catch (wsErr) {
          console.error('[useProgressiveGraph] failed to fetch weak signals:', wsErr);
        }
      }

      const standardNodes: GraphNode[] = (data.nodes ?? [])
        .filter((n: any) => n.label && n.label.trim() !== '' && n.type && n.type.trim() !== '')
        .map(
          (n: { id: string; label: string; type: EntityType; fileCount: number; totalOccurrences: number; tfidf?: number; color: string }) => ({
            id: n.id,
            label: n.label,
            type: n.type,
            fileCount: n.fileCount,
            totalOccurrences: n.totalOccurrences,
            tfidf: n.tfidf,
            color: ENTITY_COLORS[n.type] || '#6b7280',
          })
        );

      const seenIds = new Set<string>();
      const newNodes: GraphNode[] = [];
      for (const n of [...weakNodes, ...standardNodes]) {
        if (!seenIds.has(n.id)) {
          seenIds.add(n.id);
          newNodes.push(n);
        }
      }

      if (newNodes.length === 0) {
        setHasMore(false);
        setAutoLoadDone(true);
        return;
      }

      const allKnownIds = [
        ...Array.from(loadedNodeIdsRef.current),
        ...newNodes.map((n) => n.id),
      ];

      const edgesRes = await fetch('/api/graph/edges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeIds: allKnownIds }),
      });
      const edgesData = edgesRes.ok ? await edgesRes.json() : { edges: [] };
      const newEdges: GraphEdge[] = (edgesData.edges ?? []).map(
        (e: { source: string; target: string; weight: number }) => ({
          source: e.source,
          target: e.target,
          weight: e.weight,
        })
      );

      mergeNewData(newNodes, newEdges);

      offsetRef.current = offset + newNodes.length;
      batchCountRef.current += 1;

      const more = data.has_more ?? false;
      setHasMore(more);

      if (!more) {
        setAutoLoadDone(true);
        return;
      }

      if (batchCountRef.current < AUTO_STOP_AFTER_BATCHES) {
        autoTimerRef.current = setTimeout(() => {
          fetchBatch();
        }, AUTO_LOAD_DELAY_MS);
      } else {
        setAutoLoadDone(true);
      }
    } catch (err) {
      console.error('[useProgressiveGraph] fetchBatch error:', err);
    } finally {
      setIsLoadingBatch(false);
    }
  }, [mergeNewData]);

  const resetAndStart = useCallback(async () => {
    if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    offsetRef.current = 0;
    batchCountRef.current = 0;
    loadedNodeIdsRef.current = new Set();
    loadedEdgeKeysRef.current = new Set();
    setLoadedNodes([]);
    setLoadedEdges([]);
    setHasMore(false);
    setAutoLoadDone(false);

    if (!sessionIdRef.current) return;

    try {
      const from = filtersRef.current.dateRange.from ? filtersRef.current.dateRange.from.toISOString() : '';
      const to = filtersRef.current.dateRange.to ? filtersRef.current.dateRange.to.toISOString() : '';
      const params = new URLSearchParams({
        sessionId: sessionIdRef.current!,
        types: filtersRef.current.entityTypes.join(','),
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
      });
      const res = await fetch(`/api/graph/count?${params}`);
      const data = res.ok ? await res.json() : { count: 0 };
      setTotalCount(data.count ?? 0);
    } catch {
      setTotalCount(0);
    }

    fetchBatch();
  }, [fetchBatch]);

  const fromParam = filters.dateRange.from ? filters.dateRange.from.toISOString() : '';
  const toParam = filters.dateRange.to ? filters.dateRange.to.toISOString() : '';

  useEffect(() => {
    resetAndStart();
    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    };
  }, [sessionId, typeParam, fromParam, toParam, refreshTrigger, filters.showWeakSignals]);

  const loadMore = useCallback(() => {
    if (isLoadingBatch || !hasMore) return;
    batchCountRef.current = 0;
    setAutoLoadDone(false);
    fetchBatch();
  }, [isLoadingBatch, hasMore, fetchBatch]);

  const expandNode = useCallback(
    async (nodeId: string) => {
      const loadedIds = Array.from(loadedNodeIdsRef.current);
      try {
        const res = await fetch('/api/graph/neighbors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nodeId, loadedIds, sessionId: sessionIdRef.current }),
        });
        if (!res.ok) return;
        const data = await res.json();

        const newNodes: GraphNode[] = (data.nodes ?? [])
          .filter((n: any) => n.label && n.label.trim() !== '' && n.type && n.type.trim() !== '')
          .map(
            (n: { id: string; label: string; type: EntityType; fileCount: number; totalOccurrences: number; tfidf?: number; color: string }) => ({
              id: n.id,
              label: n.label,
              type: n.type,
              fileCount: n.fileCount,
              totalOccurrences: n.totalOccurrences,
              tfidf: n.tfidf,
              color: ENTITY_COLORS[n.type] || '#6b7280',
            })
          );

        const newEdges: GraphEdge[] = (data.edges ?? []).map(
          (e: { source: string; target: string; weight: number }) => ({
            source: e.source,
            target: e.target,
            weight: e.weight,
          })
        );

        mergeNewData(newNodes, newEdges);
      } catch (err) {
        console.error('[useProgressiveGraph] expandNode error:', err);
      }
    },
    [mergeNewData]
  );

  return {
    loadedNodes,
    loadedEdges,
    totalCount,
    loadedCount: loadedNodeIdsRef.current.size,
    hasMore,
    isLoadingBatch,
    autoLoadDone,
    loadMore,
    expandNode,
  };
}
