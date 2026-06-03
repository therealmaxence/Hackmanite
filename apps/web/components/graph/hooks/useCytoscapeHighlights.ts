import { useEffect, useCallback } from 'react';
import cytoscape from 'cytoscape';
import { GraphNode, GraphEdge } from '@/lib/graph-builder';
import { GraphFilters } from '@/types/graph';

interface UseCytoscapeHighlightsProps {
  cy: cytoscape.Core | null;
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNodeId: string | null;
  selectedNodeIds: string[];
  filters: GraphFilters;
  adjacency: Map<string, Set<string>>;
  communityMap: Map<string, string>;
}

export function useCytoscapeHighlights({
  cy,
  nodes,
  edges,
  selectedNodeId,
  selectedNodeIds,
  filters,
  adjacency,
  communityMap,
}: UseCytoscapeHighlightsProps) {
  const collectHopNeighborhood = useCallback(
    (rootId: string, hopCount: number, adjMap: Map<string, Set<string>>) => {
      const visited = new Set<string>([rootId]);
      let frontier = [rootId];
      for (let depth = 0; depth < hopCount; depth += 1) {
        const next: string[] = [];
        for (const id of frontier) {
          adjMap.get(id)?.forEach((nbr) => {
            if (!visited.has(nbr)) {
              visited.add(nbr);
              next.push(nbr);
            }
          });
        }
        frontier = next;
        if (frontier.length === 0) break;
      }
      return visited;
    },
    []
  );

  useEffect(() => {
    if (!cy) return;

    const timer = setTimeout(() => {
      const q = filters.searchQuery.toLowerCase();
      const minConn = filters.minConnections ?? 0;
      const minOcc = filters.minOccurrences ?? 2;
      const minEdgeWeight = filters.minEdgeWeight ?? 0;
      const hiddenComms = filters.hiddenCommunities ?? [];

      const degreeActiveIds = new Set(
        nodes
          .filter((n) => {
            if (selectedNodeIds.includes(n.id)) return true;
            if ((adjacency.get(n.id)?.size ?? 0) < minConn) return false;
            if (n.totalOccurrences < minOcc) return false;
            if (filters.crossDocumentOnly && n.fileCount <= 1) return false;
            if (hiddenComms.includes(communityMap.get(n.id) || '')) return false;
            return true;
          })
          .map((n) => n.id)
      );

      const neighborhoodIds = selectedNodeId
        ? collectHopNeighborhood(selectedNodeId, 1, adjacency)
        : null;

      const activeIds = neighborhoodIds
        ? new Set(Array.from(neighborhoodIds).filter((id) => degreeActiveIds.has(id)))
        : degreeActiveIds;

      cy.batch(() => {
        cy.elements().removeClass('faded highlighted');
        const hasSelection = selectedNodeIds.length > 0;
        const hasSearch = !!q;

        cy.nodes().forEach((node) => {
          const nodeId = node.id();
          let isActive = activeIds.has(nodeId);

          if (isActive && minEdgeWeight > 0 && !selectedNodeIds.includes(nodeId)) {
            if (!node.connectedEdges().some((e) => (e.data('weight') ?? 0) >= minEdgeWeight)) {
              isActive = false;
            }
          } else if (
            isActive &&
            minEdgeWeight > 0 &&
            selectedNodeIds.length === 1 &&
            nodeId !== selectedNodeId
          ) {
            if (!node.connectedEdges().some((e) => (e.data('weight') ?? 0) >= minEdgeWeight)) {
              isActive = false;
            }
          }

          if (!isActive) {
            node.addClass('faded');
          } else if (hasSearch) {
            const label = (node.data('fullLabel') || node.data('label') || '').toLowerCase();
            node.addClass(label.includes(q) ? 'highlighted' : 'faded');
          } else if (hasSelection) {
            node.addClass('highlighted');
          }
        });

        cy.edges().forEach((edge) => {
          const weight = edge.data('weight') ?? 0;
          if (
            edge.source().hasClass('faded') ||
            edge.target().hasClass('faded') ||
            weight < minEdgeWeight
          ) {
            edge.addClass('faded');
          } else if (
            edge.source().hasClass('highlighted') &&
            edge.target().hasClass('highlighted')
          ) {
            edge.addClass('highlighted');
          }
        });
      });
    }, 150);

    return () => clearTimeout(timer);
  }, [
    cy,
    filters.searchQuery,
    filters.minConnections,
    filters.minOccurrences,
    filters.minEdgeWeight,
    filters.crossDocumentOnly,
    filters.hiddenCommunities,
    selectedNodeId,
    selectedNodeIds,
    adjacency,
    nodes,
    communityMap,
    collectHopNeighborhood,
  ]);
}
