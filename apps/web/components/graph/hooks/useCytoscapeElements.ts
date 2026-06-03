import { useEffect } from 'react';
import cytoscape from 'cytoscape';
import { buildCytoscapeElements, GraphNode, GraphEdge } from '@/lib/graph-builder';
import { getLayoutConfig } from '../utils/layoutHelpers';

interface UseCytoscapeElementsProps {
  cy: cytoscape.Core | null;
  nodes: GraphNode[];
  edges: GraphEdge[];
  layout: string;
  renderedNodeIds: React.MutableRefObject<Set<string>>;
  renderedEdgeKeys: React.MutableRefObject<Set<string>>;
}

export function useCytoscapeElements({
  cy,
  nodes,
  edges,
  layout,
  renderedNodeIds,
  renderedEdgeKeys,
}: UseCytoscapeElementsProps) {
  useEffect(() => {
    if (!cy) return;

    if (nodes.length === 0) {
      cy.elements().remove();
      renderedNodeIds.current.clear();
      renderedEdgeKeys.current.clear();
      return;
    }

    const currentNodeIds = new Set(nodes.map((n) => n.id));

    const staleNodeIds = Array.from(renderedNodeIds.current).filter((id) => !currentNodeIds.has(id));
    if (staleNodeIds.length > 0) {
      staleNodeIds.forEach((id) => {
        cy.getElementById(id).remove();
        renderedNodeIds.current.delete(id);
      });
      for (const key of Array.from(renderedEdgeKeys.current)) {
        const [src, tgt] = key.split('|');
        if (staleNodeIds.includes(src) || staleNodeIds.includes(tgt)) {
          renderedEdgeKeys.current.delete(key);
        }
      }
    }

    const newNodes = nodes.filter((n) => !renderedNodeIds.current.has(n.id));
    const newEdges = edges.filter((e) => {
      const key = `${e.source}|${e.target}`;
      const keyRev = `${e.target}|${e.source}`;
      return !renderedEdgeKeys.current.has(key) && !renderedEdgeKeys.current.has(keyRev);
    });

    if (newNodes.length === 0 && newEdges.length === 0 && staleNodeIds.length === 0) return;

    if (newNodes.length > 0 || newEdges.length > 0) {
      const deltaElements = buildCytoscapeElements(newNodes, newEdges);
      cy.add(deltaElements);

      for (const n of newNodes) renderedNodeIds.current.add(n.id);
      for (const e of newEdges) {
        renderedEdgeKeys.current.add(`${e.source}|${e.target}`);
      }

      cy.trigger('zoom');
    }

    if (newNodes.length > 0) {
      const newNodeSelector = newNodes.map((n) => `#${n.id}`).join(', ');
      const newCyNodes = cy.nodes(newNodeSelector);
      const newNodeIdSet = new Set(newNodes.map((n) => n.id));

      newCyNodes.forEach((node) => {
        const neighborNodes = node.neighborhood('node').filter(
          (n: cytoscape.NodeSingular) => !newNodeIdSet.has(n.id())
        );
        if (neighborNodes.length > 0) {
          const positions = neighborNodes.map((n: cytoscape.NodeSingular) => n.position());
          const cx = positions.reduce((s: number, p: cytoscape.Position) => s + p.x, 0) / positions.length;
          const cy2 = positions.reduce((s: number, p: cytoscape.Position) => s + p.y, 0) / positions.length;
          node.position({ x: cx + (Math.random() - 0.5) * 100, y: cy2 + (Math.random() - 0.5) * 100 });
        } else {
          node.position({
            x: (Math.random() - 0.5) * 800,
            y: (Math.random() - 0.5) * 800,
          });
        }
      });

      const isInitialBatch = nodes.length <= 100;
      cy.layout(getLayoutConfig(layout, nodes.length, isInitialBatch)).run();
    }
  }, [cy, nodes, edges, layout, renderedNodeIds, renderedEdgeKeys]);
}
