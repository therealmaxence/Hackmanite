import { useEffect, MutableRefObject } from 'react';
import { useGraphStore } from '@/store/graphStore';
import type { GraphNode, GraphEdge } from '@/lib/graph-builder';

interface UseSyncGraphStoreProps {
  loadedNodesRef: MutableRefObject<GraphNode[]>;
  setLoadedNodes: React.Dispatch<React.SetStateAction<GraphNode[]>>;
  loadedEdgesRef: MutableRefObject<GraphEdge[]>;
  setLoadedEdges: React.Dispatch<React.SetStateAction<GraphEdge[]>>;
  loadedNodeIdsRef: MutableRefObject<Set<string>>;
  loadedEdgeKeysRef: MutableRefObject<Set<string>>;
}

export function useSyncGraphStore({
  loadedNodesRef,
  setLoadedNodes,
  loadedEdgesRef,
  setLoadedEdges,
  loadedNodeIdsRef,
  loadedEdgeKeysRef,
}: UseSyncGraphStoreProps) {
  const graphNodes = useGraphStore((s) => s.nodes);

  useEffect(() => {
    const graphNodeIds = new Set(graphNodes.map((n) => n.id));
    const removed = Array.from(loadedNodeIdsRef.current).filter((id) => !graphNodeIds.has(id));

    const graphNodeMap = new Map(graphNodes.map((n) => [n.id, n]));
    const graphNodeByLabelMap = new Map(graphNodes.map((n) => [n.label, n]));

    let updatedNodesCount = 0;
    const currentLoadedNodes = loadedNodesRef.current;

    const updatedLoadedNodes = currentLoadedNodes.map((ln) => {
      let gn = graphNodeMap.get(ln.id) || graphNodeByLabelMap.get(ln.label);
      if (gn) {
        if (gn.id !== ln.id || gn.type !== ln.type || gn.color !== ln.color) {
          updatedNodesCount++;
          return {
            ...ln,
            id: gn.id,
            type: gn.type,
            color: gn.color,
          };
        }
      }
      return ln;
    });

    const actualRemoved = removed.filter((id) => {
      const ln = currentLoadedNodes.find((n) => n.id === id);
      if (!ln) return true;
      const hasReplacement = graphNodes.some((gn) => gn.label === ln.label && gn.id !== ln.id);
      return !hasReplacement;
    });

    if (updatedNodesCount === 0 && actualRemoved.length === 0) return;

    for (const id of actualRemoved) {
      loadedNodeIdsRef.current.delete(id);
    }

    if (updatedNodesCount > 0) {
      for (const ln of currentLoadedNodes) {
        const gn = graphNodeMap.get(ln.id) || graphNodeByLabelMap.get(ln.label);
        if (gn && gn.id !== ln.id) {
          loadedNodeIdsRef.current.delete(ln.id);
          loadedNodeIdsRef.current.add(gn.id);
        }
      }
    }

    const allRemovedOrUpdatedIds = [...actualRemoved];
    if (updatedNodesCount > 0) {
      for (const ln of currentLoadedNodes) {
        const gn = graphNodeMap.get(ln.id) || graphNodeByLabelMap.get(ln.label);
        if (gn && gn.id !== ln.id) {
          allRemovedOrUpdatedIds.push(ln.id);
        }
      }
    }

    for (const key of Array.from(loadedEdgeKeysRef.current)) {
      const [src, tgt] = key.split('|');
      if (allRemovedOrUpdatedIds.includes(src) || allRemovedOrUpdatedIds.includes(tgt)) {
        loadedEdgeKeysRef.current.delete(key);
      }
    }

    let nextNodes = updatedLoadedNodes;
    if (actualRemoved.length > 0) {
      nextNodes = nextNodes.filter((n) => !actualRemoved.includes(n.id));
    }
    setLoadedNodes(nextNodes);

    const graphEdges = useGraphStore.getState().edges;
    const updatedEdges = graphEdges.filter((e) => {
      const nextNodeIds = new Set(nextNodes.map((n) => n.id));
      return nextNodeIds.has(e.source) && nextNodeIds.has(e.target);
    });

    loadedEdgeKeysRef.current = new Set(updatedEdges.map((e) => `${e.source}|${e.target}`));
    setLoadedEdges(updatedEdges);
  }, [graphNodes, setLoadedNodes, setLoadedEdges, loadedNodeIdsRef, loadedEdgeKeysRef, loadedNodesRef, loadedEdgesRef]);
}
