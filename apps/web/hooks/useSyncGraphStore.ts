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
    const graphNodeMap = new Map(graphNodes.map((n) => [n.id, n]));
    const graphNodeByLabelMap = new Map(graphNodes.map((n) => [n.label, n]));
    const currentLoadedNodes = loadedNodesRef.current;

    let updatedNodesCount = 0;
    const updatedLoadedNodes = currentLoadedNodes.map((ln) => {
      const gn = graphNodeMap.get(ln.id) || graphNodeByLabelMap.get(ln.label);
      if (gn && (gn.id !== ln.id || gn.type !== ln.type || gn.color !== ln.color)) {
        updatedNodesCount++;
        return { ...ln, id: gn.id, type: gn.type, color: gn.color };
      }
      return ln;
    });

    const actualRemoved = Array.from(loadedNodeIdsRef.current).filter((id) => {
      if (graphNodeIds.has(id)) return false;
      const ln = currentLoadedNodes.find((n) => n.id === id);
      if (!ln) return true;
      const rep = graphNodeByLabelMap.get(ln.label);
      return !rep || rep.id === ln.id;
    });

    if (updatedNodesCount === 0 && actualRemoved.length === 0) return;

    const removedOrUpdatedSet = new Set(actualRemoved);
    actualRemoved.forEach((id) => loadedNodeIdsRef.current.delete(id));

    if (updatedNodesCount > 0) {
      currentLoadedNodes.forEach((ln) => {
        const gn = graphNodeMap.get(ln.id) || graphNodeByLabelMap.get(ln.label);
        if (gn && gn.id !== ln.id) {
          loadedNodeIdsRef.current.delete(ln.id);
          loadedNodeIdsRef.current.add(gn.id);
          removedOrUpdatedSet.add(ln.id);
        }
      });
    }

    Array.from(loadedEdgeKeysRef.current).forEach((key) => {
      const [src, tgt] = key.split('|');
      if (removedOrUpdatedSet.has(src) || removedOrUpdatedSet.has(tgt)) {
        loadedEdgeKeysRef.current.delete(key);
      }
    });

    const nextNodes = actualRemoved.length > 0
      ? updatedLoadedNodes.filter((n) => !removedOrUpdatedSet.has(n.id))
      : updatedLoadedNodes;
    setLoadedNodes(nextNodes);

    const nextNodeIds = new Set(nextNodes.map((n) => n.id));
    const updatedEdges = useGraphStore.getState().edges.filter(
      (e) => nextNodeIds.has(e.source) && nextNodeIds.has(e.target)
    );
    loadedEdgeKeysRef.current = new Set(updatedEdges.map((e) => `${e.source}|${e.target}`));
    setLoadedEdges(updatedEdges);
  }, [graphNodes, setLoadedNodes, setLoadedEdges, loadedNodeIdsRef, loadedEdgeKeysRef, loadedNodesRef]);
}
