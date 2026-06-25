'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useUploadStore } from '@/store/uploadStore';
import { useGraphStore } from '@/store/graphStore';
import { ENTITY_COLORS } from '@/types/entities';
import type { EntityType } from '@/types/entities';
import type { GraphNode, GraphEdge } from '@/lib/graph-builder';
import { useSyncGraphStore } from './useSyncGraphStore';
import { useTranslation } from '@/lib/i18n';

const BATCH_SIZE = 100;
const AUTO_LOAD_DELAY_MS = 300;
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
  setLoadedLimit: (targetCount: number) => Promise<void>;
}

const mapRawNode = (n: any, isWeak?: boolean): GraphNode => ({
  id: n.id,
  label: n.label,
  type: n.type,
  fileCount: n.fileCount ?? 0,
  totalOccurrences: n.totalOccurrences ?? n.totalCount ?? 0,
  tfidf: n.tfidf ?? n.score,
  color: ENTITY_COLORS[n.type as EntityType] || '#6b7280',
  ...(isWeak ? { isWeakSignal: true } : {}),
});

const isValidNode = (n: any) => n?.label?.trim() && n?.type?.trim();

export function useProgressiveGraph(): ProgressiveGraphState {
  const { sessionId } = useUploadStore();
  const { filters, setNodes, setEdges, refreshTrigger } = useGraphStore();
  const { t } = useTranslation();

  const [loadedNodes, setLoadedNodes] = useState<GraphNode[]>([]);
  const [loadedEdges, setLoadedEdges] = useState<GraphEdge[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingBatch, setIsLoadingBatch] = useState(false);
  const [autoLoadDone, setAutoLoadDone] = useState(false);

  const offsetRef = useRef(0);
  const batchCountRef = useRef(0);
  const loadedNodeIdsRef = useRef<Set<string>>(new Set());
  const loadedEdgeKeysRef = useRef<Set<string>>(new Set());
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionIdRef = useRef(sessionId);
  const filtersRef = useRef(filters);

  sessionIdRef.current = sessionId;
  filtersRef.current = filters;

  const loadedNodesRef = useRef(loadedNodes);
  const loadedEdgesRef = useRef(loadedEdges);
  loadedNodesRef.current = loadedNodes;
  loadedEdgesRef.current = loadedEdges;

  useEffect(() => { setNodes(loadedNodes); }, [loadedNodes, setNodes]);
  useEffect(() => { setEdges(loadedEdges); }, [loadedEdges, setEdges]);

  useSyncGraphStore({
    loadedNodesRef, setLoadedNodes, loadedEdgesRef, setLoadedEdges,
    loadedNodeIdsRef, loadedEdgeKeysRef,
  });

  const typeParam = filters.entityTypes.join(',');

  const mergeNewData = useCallback((newNodes: GraphNode[], newEdges: GraphEdge[]) => {
    const addedNodes = newNodes.filter((n) => {
      if (loadedNodeIdsRef.current.has(n.id)) return false;
      loadedNodeIdsRef.current.add(n.id);
      return true;
    });
    const addedEdges = newEdges.filter((e) => {
      const k1 = `${e.source}|${e.target}`, k2 = `${e.target}|${e.source}`;
      if (loadedEdgeKeysRef.current.has(k1) || loadedEdgeKeysRef.current.has(k2)) return false;
      loadedEdgeKeysRef.current.add(k1);
      return true;
    });
    if (addedNodes.length) setLoadedNodes((prev) => [...prev, ...addedNodes]);
    if (addedEdges.length) setLoadedEdges((prev) => [...prev, ...addedEdges]);
  }, []);

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
        _t: String(Date.now()),
      });

      const res = await fetch(`/api/graph/nodes?${params}`);
      if (!res.ok) return;
      const data = await res.json();

      let weakNodes: GraphNode[] = [];
      if (offset === 0 && filtersRef.current.showWeakSignals) {
        try {
          const wsRes = await fetch(`/api/stats/weak-signals?sessionId=${sid}&_t=${Date.now()}`);
          if (wsRes.ok) {
            const wsData = await wsRes.json();
            const rawWeak = [
              ...(wsData.bridgeSignals || []),
              ...(wsData.nicheSignals || []),
              ...(wsData.emergingSignals || []),
            ];
            const uniqueWeak = Array.from(new Map(rawWeak.map(w => [w.id, w])).values());
            weakNodes = uniqueWeak.map(w => mapRawNode(w, true));
          }
        } catch (wsErr) {
          console.error('[useProgressiveGraph] failed to fetch weak signals:', wsErr);
        }
      }

      const standardNodes = (data.nodes ?? []).filter(isValidNode).map((n: any) => mapRawNode(n));

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

      const allKnownIds = [...Array.from(loadedNodeIdsRef.current), ...newNodes.map((n) => n.id)];
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
        autoTimerRef.current = setTimeout(() => { fetchBatch(); }, AUTO_LOAD_DELAY_MS);
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
    loadedNodeIdsRef.current.clear();
    loadedEdgeKeysRef.current.clear();
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
        _t: String(Date.now()),
      });
      const res = await fetch(`/api/graph/count?${params}`);
      setTotalCount(res.ok ? (await res.json()).count ?? 0 : 0);
    } catch {
      setTotalCount(0);
    }

    fetchBatch();
  }, [fetchBatch]);

  const fromParam = filters.dateRange.from ? filters.dateRange.from.toISOString() : '';
  const toParam = filters.dateRange.to ? filters.dateRange.to.toISOString() : '';

  useEffect(() => {
    resetAndStart();
    return () => { if (autoTimerRef.current) clearTimeout(autoTimerRef.current); };
  }, [sessionId, typeParam, fromParam, toParam, refreshTrigger, filters.showWeakSignals, resetAndStart]);

  const loadMore = useCallback(() => {
    if (isLoadingBatch || !hasMore) return;
    batchCountRef.current = 0;
    setAutoLoadDone(false);
    fetchBatch();
  }, [isLoadingBatch, hasMore, fetchBatch]);

  const expandNode = useCallback(async (nodeId: string) => {
    const loadedIds = Array.from(loadedNodeIdsRef.current);
    try {
      const res = await fetch('/api/graph/neighbors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId, loadedIds, sessionId: sessionIdRef.current }),
      });
      if (!res.ok) return;
      const data = await res.json();

      const newNodes = (data.nodes ?? []).filter(isValidNode).map((n: any) => mapRawNode(n));
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
  }, [mergeNewData]);

  const setLoadedLimit = useCallback(async (targetCount: number) => {
    const currentCount = loadedNodesRef.current.length;
    if (targetCount === currentCount || targetCount <= 0 || targetCount > totalCount) return;

    if (targetCount > 500 && targetCount > currentCount) {
      const ok = typeof window !== 'undefined'
        ? window.confirm(t('graph.controls.confirm_large_load') || 'Loading more than 500 nodes might take a bit of time. Do you want to proceed?')
        : true;
      if (!ok) return;
    }

    if (targetCount < currentCount) {
      const nextNodes = loadedNodesRef.current.slice(0, targetCount);
      const nextNodeIds = new Set(nextNodes.map(n => n.id));
      loadedNodeIdsRef.current = nextNodeIds;

      const nextEdges = loadedEdgesRef.current.filter(e => nextNodeIds.has(e.source) && nextNodeIds.has(e.target));
      loadedEdgeKeysRef.current = new Set(nextEdges.map(e => `${e.source}|${e.target}`));

      offsetRef.current = nextNodes.length;
      setLoadedNodes(nextNodes);
      setLoadedEdges(nextEdges);
      setHasMore(totalCount > nextNodes.length);
    } else {
      const diff = targetCount - currentCount;
      if (diff <= 0) return;

      setIsLoadingBatch(true);
      try {
        const sid = sessionIdRef.current;
        if (!sid) return;

        const offset = offsetRef.current;
        const from = filtersRef.current.dateRange.from ? filtersRef.current.dateRange.from.toISOString() : '';
        const to = filtersRef.current.dateRange.to ? filtersRef.current.dateRange.to.toISOString() : '';

        const params = new URLSearchParams({
          sessionId: sid,
          limit: String(diff),
          offset: String(offset),
          types: filtersRef.current.entityTypes.join(','),
          ...(from ? { from } : {}),
          ...(to ? { to } : {}),
          _t: String(Date.now()),
        });

        const res = await fetch(`/api/graph/nodes?${params}`);
        if (!res.ok) return;
        const data = await res.json();

        let weakNodes: GraphNode[] = [];
        if (offset === 0 && filtersRef.current.showWeakSignals) {
          try {
            const wsRes = await fetch(`/api/stats/weak-signals?sessionId=${sid}&_t=${Date.now()}`);
            if (wsRes.ok) {
              const wsData = await wsRes.json();
              const rawWeak = [
                ...(wsData.bridgeSignals || []),
                ...(wsData.nicheSignals || []),
                ...(wsData.emergingSignals || []),
              ];
              const uniqueWeak = Array.from(new Map(rawWeak.map(w => [w.id, w])).values());
              weakNodes = uniqueWeak.map(w => mapRawNode(w, true));
            }
          } catch (wsErr) {
            console.error('[useProgressiveGraph] failed to fetch weak signals:', wsErr);
          }
        }

        const standardNodes = (data.nodes ?? []).filter(isValidNode).map((n: any) => mapRawNode(n));

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
          return;
        }

        const allKnownIds = [...Array.from(loadedNodeIdsRef.current), ...newNodes.map((n) => n.id)];
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
        const more = data.has_more ?? false;
        setHasMore(more);
      } catch (err) {
        console.error('[useProgressiveGraph] setLoadedLimit grow error:', err);
      } finally {
        setIsLoadingBatch(false);
      }
    }
  }, [mergeNewData, totalCount]);

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
    setLoadedLimit,
  };
}
