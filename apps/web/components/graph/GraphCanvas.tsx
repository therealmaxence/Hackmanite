'use client';

import { useEffect, useRef, useMemo, useCallback } from 'react';
import cytoscape, { Core } from 'cytoscape';
// @ts-expect-error — no types for cose-bilkent
import coseBilkent from 'cytoscape-cose-bilkent';
import {
  buildCytoscapeElements,
  cytoscapeStylesheet,
  cytoscapeLayoutConfig,
} from '@/lib/graph-builder';
import { useGraphStore } from '@/store/graphStore';
import { GraphNode, GraphEdge } from '@/lib/graph-builder';
import { computeGraphCommunities } from '@/lib/graphCommunities';

// Register the cose-bilkent layout extension once at module load
if (typeof window !== 'undefined') {
  cytoscape.use(coseBilkent);
}

interface GraphCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** Called when user taps a node — used by progressive loader to expand neighbors */
  onNodeExpand?: (nodeId: string) => void;
}

export default function GraphCanvas({ nodes, edges, onNodeExpand }: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const { selectNode, setSelectedNodeIds, filters, selectedNodeId, selectedNodeIds, layout, layoutTrigger } = useGraphStore();

  // Track which IDs are already in Cytoscape to enable incremental updates
  const renderedNodeIds = useRef<Set<string>>(new Set());
  const renderedEdgeKeys = useRef<Set<string>>(new Set());

  const getLayoutConfig = (layoutName: string, nodeCount: number, fitViewport = true) => {
    if (layoutName === 'cose-bilkent') {
      if (nodeCount > 300) {
        return {
          name: 'cose',
          animate: false,
          fit: fitViewport,
          padding: 30,
          nodeRepulsion: 150000,
          idealEdgeLength: 300,
          randomize: false,
        };
      }
      let numIter = 2500;
      let animate = true;
      if (nodeCount > 100) { numIter = 1500; animate = true; }
      return { ...cytoscapeLayoutConfig, animate, numIter, fit: fitViewport, randomize: false };
    }
    return { name: layoutName, animate: nodeCount < 500, animationDuration: 600, fit: fitViewport, padding: 30 };
  };

  // Memoize adjacency map — recomputed only when edges change
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

  // Memoize community partitions — stable across filter changes
  const communityMap = useMemo(() => computeGraphCommunities(nodes, edges), [nodes, edges]);

  // ── Initialize Cytoscape once ───────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: [],           // start empty — batches are added incrementally
      style: cytoscapeStylesheet,
      minZoom: 0.1,
      maxZoom: 4,
      wheelSensitivity: 0.3,
    });

    cyRef.current = cy;

    cy.on('tap', 'node', (e) => {
      const nodeId = e.target.id();
      const origEvent = e.originalEvent;
      const isMulti = origEvent && (origEvent.ctrlKey || origEvent.metaKey);
      if (isMulti) {
        const currentSelected = useGraphStore.getState().selectedNodeIds;
        if (currentSelected.includes(nodeId)) {
          const nextSelected = currentSelected.filter((id) => id !== nodeId);
          setSelectedNodeIds(nextSelected);
        } else {
          const nextSelected = [...currentSelected, nodeId];
          setSelectedNodeIds(nextSelected);
        }
      } else {
        selectNode(nodeId);
      }
    });

    cy.on('tap', (e) => {
      if (e.target === cy) {
        cy.elements().removeClass('faded highlighted');
        setSelectedNodeIds([]);
      }
    });

    cy.on('dbltap', 'node', (e) => {
      // Double-click expands neighbors via the onNodeExpand callback
      onNodeExpand?.(e.target.id());
      // Also zoom to the neighborhood already in the canvas
      cy.fit(e.target.closedNeighborhood(), 60);
    });

    cy.on('cxttap', 'node', (e) => {
      e.preventDefault();
      const d = e.target.data();
      navigator.clipboard?.writeText(d.fullLabel || d.label).catch(() => {});
    });

    const handleZoom = () => {
      if (cy.zoom() < 0.35) {
        cy.nodes().addClass('hide-label');
      } else {
        cy.nodes().removeClass('hide-label');
      }
    };
    cy.on('zoom', handleZoom);

    return () => {
      cy.off('zoom', handleZoom);
      cy.destroy();
      cyRef.current = null;
      renderedNodeIds.current.clear();
      renderedEdgeKeys.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Incremental element update ──────────────────────────────────────────────
  // On each batch arrival, diff both additions and removals so deleted nodes
  // are immediately removed from Cytoscape, not just hidden.
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    if (nodes.length === 0) {
      cy.elements().remove();
      renderedNodeIds.current.clear();
      renderedEdgeKeys.current.clear();
      return;
    }

    const currentNodeIds = new Set(nodes.map((n) => n.id));
    const currentEdgeKeys = new Set(
      edges.flatMap((e) => [`${e.source}|${e.target}`, `${e.target}|${e.source}`])
    );

    // Remove stale nodes (deleted entities/files)
    const staleNodeIds = Array.from(renderedNodeIds.current).filter((id) => !currentNodeIds.has(id));
    if (staleNodeIds.length > 0) {
      staleNodeIds.forEach((id) => {
        cy.getElementById(id).remove();
        renderedNodeIds.current.delete(id);
      });
      // Also purge edge keys that referenced the removed nodes
      for (const key of Array.from(renderedEdgeKeys.current)) {
        const [src, tgt] = key.split('|');
        if (staleNodeIds.includes(src) || staleNodeIds.includes(tgt)) {
          renderedEdgeKeys.current.delete(key);
        }
      }
    }

    // Add new nodes
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]);

  // ── Layout change or manual reposition ──────────────────────────────────────
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || cy.nodes().length === 0) return;

    const forceRandomize = layoutTrigger > 0;
    const config = getLayoutConfig(layout, nodes.length, true);
    if (forceRandomize && layout === 'cose-bilkent') {
      config.randomize = true;
    }

    cy.layout(config).run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, layoutTrigger]);

  // ── Selection sync ──────────────────────────────────────────────────────────
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    const cySelectedIds = cy.nodes(':selected').map((n: cytoscape.NodeSingular) => n.id());
    const match = cySelectedIds.length === selectedNodeIds.length && cySelectedIds.every((id) => selectedNodeIds.includes(id));
    if (match) return;

    cy.elements().unselect();
    if (selectedNodeIds && selectedNodeIds.length > 0) {
      cy.batch(() => {
        selectedNodeIds.forEach((id) => {
          cy.getElementById(id).select();
        });
      });
      if (selectedNodeIds.length === 1) {
        const node = cy.getElementById(selectedNodeIds[0]);
        if (node.length > 0) {
          cy.animate({
            center: { eles: node },
            zoom: Math.max(cy.zoom(), 1.2)
          }, {
            duration: 500,
            easing: 'ease-in-out-cubic'
          });
        }
      }
    }
  }, [selectedNodeIds]);

  // ── Hop-neighborhood collector (for filter effects) ─────────────────────────
  const collectHopNeighborhood = useCallback(
    (rootId: string, hopCount: number, adjMap: Map<string, Set<string>>) => {
      const visited = new Set<string>([rootId]);
      let frontier = [rootId];
      for (let depth = 0; depth < hopCount; depth += 1) {
        const next: string[] = [];
        for (const id of frontier) {
          adjMap.get(id)?.forEach((nbr) => { if (!visited.has(nbr)) { visited.add(nbr); next.push(nbr); } });
        }
        frontier = next;
        if (frontier.length === 0) break;
      }
      return visited;
    },
    []
  );

  // ── Filter / highlight effect ───────────────────────────────────────────────
  useEffect(() => {
    const cy = cyRef.current;
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

      // Batch all DOM mutations into a single Cytoscape pass
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
          }
          else if (isActive && minEdgeWeight > 0 && selectedNodeIds.length === 1 && nodeId !== selectedNodeId) {
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
          if (edge.source().hasClass('faded') || edge.target().hasClass('faded') || weight < minEdgeWeight) {
            edge.addClass('faded');
          } else if (edge.source().hasClass('highlighted') && edge.target().hasClass('highlighted')) {
            edge.addClass('highlighted');
          }
        });
      });
    }, 150);

    return () => clearTimeout(timer);
  }, [
    filters.searchQuery, filters.minConnections, filters.minOccurrences, filters.minEdgeWeight,
    filters.crossDocumentOnly, filters.hiddenCommunities,
    selectedNodeId, selectedNodeIds, adjacency, nodes, communityMap, collectHopNeighborhood,
  ]);

  return (
    <div
      ref={containerRef}
      id="cy"
      style={{ width: '100%', height: '100%', background: 'var(--bg-base)' }}
    />
  );
}
