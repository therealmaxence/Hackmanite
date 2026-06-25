import { useEffect, useMemo, useRef } from 'react';
import cytoscape, { Core } from 'cytoscape';
// @ts-expect-error — no types for cose-bilkent
import coseBilkent from 'cytoscape-cose-bilkent';
import { EmailNodeData, LayoutType } from '../types';
import { getLayoutConfig } from '../utils';

if (typeof window !== 'undefined') cytoscape.use(coseBilkent);

const CY_STYLE = [
  {
    selector: 'node',
    style: {
      'background-color': 'data(color)', label: 'data(label)', color: '#f0f0f4', 'font-family': 'var(--font-mono, DM Mono, monospace)',
      'font-size': '10px', 'text-valign': 'bottom', 'text-margin-y': 4, 'text-wrap': 'wrap', 'text-outline-color': '#0a090c',
      'text-outline-width': 2, width: 26, height: 26, 'border-width': 2, 'border-color': 'data(color)', 'border-opacity': 0.4,
      'transition-property': 'background-color, border-color, border-width, width, height, opacity', 'transition-duration': 0.25,
    },
  },
  { selector: 'node:selected', style: { 'border-width': 3, 'border-color': 'var(--color-primary)', 'border-opacity': 1, width: 32, height: 32 } },
  { selector: 'node.highlighted', style: { 'border-width': 3, 'border-color': 'var(--color-primary)', 'border-opacity': 1, width: 32, height: 32, opacity: 1 } },
  { selector: 'node.faded', style: { opacity: 0.15 } },
  {
    selector: 'edge',
    style: {
      width: 2, 'line-color': '#2C3545', 'target-arrow-color': '#2C3545', 'target-arrow-shape': 'triangle', 'arrow-scale': 1.1,
      'curve-style': 'unbundled-bezier', 'control-point-distances': 'data(curveDistance)', 'control-point-weights': 0.5, opacity: 0.7,
      'transition-property': 'line-color, target-arrow-color, opacity, width', 'transition-duration': 0.25,
    },
  },
  { selector: 'edge[type="FORWARD"]', style: { 'line-style': 'dashed', 'line-color': '#EC4899', 'target-arrow-color': '#EC4899', 'target-arrow-shape': 'chevron', 'line-dash-pattern': [6, 3] } },
  { selector: 'edge[type="REPLY"]', style: { 'line-style': 'solid', 'line-color': '#2C3545', 'target-arrow-color': '#2C3545', 'target-arrow-shape': 'triangle' } },
  { selector: 'edge.highlighted', style: { width: 3.5, opacity: 1 } },
  { selector: 'edge[type="FORWARD"].highlighted', style: { 'line-color': '#F472B6', 'target-arrow-color': '#F472B6' } },
  { selector: 'edge[type="REPLY"].highlighted', style: { 'line-color': 'var(--color-primary)', 'target-arrow-color': 'var(--color-primary)' } },
  { selector: 'edge.faded', style: { opacity: 0.05 } },
];

interface UseEmailGraphProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  elements: Record<string, unknown>[];
  layoutType: LayoutType;
  activeTab: 'graph' | 'list';
  onNodeSelect: (data: EmailNodeData) => void;
  onBackgroundTap: () => void;
  selectedEmailId: string | null;
  onNodeRightClick?: (data: EmailNodeData, x: number, y: number) => void;
}

export function useEmailGraph({
  containerRef,
  elements,
  layoutType,
  activeTab,
  onNodeSelect,
  onBackgroundTap,
  selectedEmailId,
  onNodeRightClick,
}: UseEmailGraphProps) {
  const cyRef = useRef<Core | null>(null);

  const onNodeRightClickRef = useRef(onNodeRightClick);
  const onBackgroundTapRef = useRef(onBackgroundTap);

  useEffect(() => {
    onNodeRightClickRef.current = onNodeRightClick;
    onBackgroundTapRef.current = onBackgroundTap;
  });

  const highlightNeighborhood = (cy: Core, node: any) => {
    cy.batch(() => {
      cy.elements().removeClass('faded highlighted');
      const connectedNodes = node.closedNeighborhood();
      cy.nodes().forEach((n) => { n.addClass(connectedNodes.contains(n) ? 'highlighted' : 'faded'); });
      cy.edges().forEach((e) => { e.addClass(connectedNodes.contains(e.source()) && connectedNodes.contains(e.target()) ? 'highlighted' : 'faded'); });
    });
  };

  useEffect(() => {
    if (activeTab !== 'graph' || !containerRef.current || elements.length === 0) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: elements as unknown as cytoscape.ElementDefinition[],
      style: CY_STYLE as unknown as cytoscape.StylesheetJson,
      layout: getLayoutConfig(layoutType),
      minZoom: 0.1,
      maxZoom: 3,
      wheelSensitivity: 0.25,
    });

    cyRef.current = cy;

    cy.on('tap', 'node', (e) => {
      onNodeSelect(e.target.data() as EmailNodeData);
      highlightNeighborhood(cy, e.target);
    });

    cy.on('tap', (e) => {
      if (e.target === cy) {
        cy.elements().removeClass('faded highlighted');
        onBackgroundTap();
      }
    });

    cy.on('cxttap', 'node', (e) => {
      e.preventDefault();
      const node = e.target;
      const data = node.data() as EmailNodeData;
      const origEvent = e.originalEvent;
      const x = origEvent.clientX || origEvent.pageX;
      const y = origEvent.clientY || origEvent.pageY;
      onNodeRightClickRef.current?.(data, x, y);
    });

    cy.on('cxttap', (e) => {
      if (e.target === cy) {
        onBackgroundTapRef.current?.();
      }
    });

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [activeTab, elements, layoutType, onNodeSelect, onBackgroundTap]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || !selectedEmailId) return;

    const node = cy.getElementById(selectedEmailId);
    if (node.length > 0) {
      node.select();
      cy.animate({ center: { eles: node }, zoom: Math.max(cy.zoom(), 1.0) }, { duration: 250 });
      highlightNeighborhood(cy, node);
    }
  }, [selectedEmailId, elements]);

  return cyRef;
}

export function useEmailElements(
  filteredEmails: Record<string, unknown>[],
  rawNodes: Record<string, unknown>[],
  rawEdges: Record<string, unknown>[],
  senderColors: Record<string, string>
): Record<string, unknown>[] {
  return useMemo(() => {
    const activeMsgIds = new Set(filteredEmails.map((e) => e.messageId as string));
    const nodesList = (rawNodes as Array<{ data: { id: string; from: string } }>)
      .filter((n) => activeMsgIds.has(n.data.id))
      .map((n) => ({ ...n, data: { ...n.data, color: senderColors[n.data.from?.toLowerCase()] || 'var(--color-secondary)' } }));
    const edgesList = (rawEdges as Array<{ data: { source: string; target: string } }>).filter((e) => activeMsgIds.has(e.data.source) && activeMsgIds.has(e.data.target));
    return [...nodesList, ...edgesList];
  }, [filteredEmails, rawNodes, rawEdges, senderColors]);
}

