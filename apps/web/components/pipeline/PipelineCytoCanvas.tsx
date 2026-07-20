'use client';

import { useRef, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import cytoscape from 'cytoscape';
import ZoomControls from '@/components/ui/ZoomControls';
import { useTranslation } from '@/lib/i18n';

const CATEGORY_COLORS: Record<string, string> = {
  source: '#00f0ff',
  filter: '#f59e0b',
  transform: '#a78bfa',
  visualizer: '#fb923c',
  output: '#ff2a85',
};

function getCategory(type: string) {
  if (type.startsWith('source.')) return 'source';
  if (type.startsWith('filter.')) return 'filter';
  if (type.startsWith('transform.')) return 'transform';
  if (type.startsWith('visualize.')) return 'visualizer';
  return 'output';
}

const menuButtonStyle: CSSProperties = {
  width: '100%',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  padding: '0.45rem 0.55rem',
  background: 'transparent',
  color: 'var(--color-text)',
  cursor: 'pointer',
  textAlign: 'left',
  fontSize: '0.75rem',
  fontWeight: 600,
};

const buildStylesheet = (): cytoscape.StylesheetStyle[] => [
  {
    selector: 'node',
    style: {
      shape: 'roundrectangle' as any,
      width: '200px',
      height: '72px',
      'background-color': '#1e1d24',
      'border-width': 1.5,
      'border-color': '#2d2c35',
      'text-valign': 'center',
      'text-halign': 'center',
      content: 'data(label)',
      color: '#e2e0ef',
      'font-size': 13,
      'font-family': 'var(--font-body, Inter, sans-serif)',
      'font-weight': 600,
      'text-wrap': 'ellipsis',
      'text-max-width': '170px',
      'padding-left': '0px',
      'padding-right': '0px',
      'background-image': "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14'><circle cx='7' cy='7' r='5' fill='%237c3aed' stroke='%23a78bfa' stroke-width='2'/></svg>",
      'background-position-x': '182px',
      'background-position-y': '29px',
      'background-width': '14px',
      'background-height': '14px',
      'background-clip': 'node',
    },
  },
  ...Object.entries(CATEGORY_COLORS).map(([category, color]) => ({
    selector: `node[category = "${category}"]`,
    style: { 'border-color': color },
  })),
  {
    selector: 'node:selected',
    style: {
      'border-width': 2.5,
      'border-color': '#7c3aed',
      'background-color': '#211f2e',
      'overlay-color': '#7c3aed' as any,
      'overlay-opacity': 0.06 as any,
    },
  },
  {
    selector: 'node.disabled',
    style: {
      opacity: 0.42,
      'background-color': '#17161d',
      'border-style': 'dashed',
      'text-opacity': 0.72,
    } as any,
  },
  {
    selector: 'node[state = "running"]',
    style: {
      'border-width': 3,
      'border-color': '#d946ef',
      'background-color': '#261730',
      'overlay-color': '#d946ef' as any,
      'overlay-opacity': 0.12 as any,
      'shadow-blur': 28,
      'shadow-color': '#d946ef',
      'shadow-opacity': 0.75,
      'shadow-offset-x': 0,
      'shadow-offset-y': 0,
    } as any,
  },
  {
    selector: 'node.connection-source',
    style: { 'border-style': 'dashed', 'shadow-blur': 18, 'shadow-color': '#a78bfa', 'shadow-opacity': 0.7 } as any,
  },
  {
    selector: 'node.connection-target',
    style: { 'border-width': 3, 'border-color': '#34d399', 'shadow-blur': 18, 'shadow-color': '#34d399', 'shadow-opacity': 0.65 } as any,
  },
  {
    selector: 'node[state = "success"]',
    style: { 'border-color': '#34d399' },
  },
  {
    selector: 'node[nodeType ^= "visualize."][state = "success"]',
    style: {
      'background-image': "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12'><circle cx='6' cy='6' r='4' fill='%237c3aed'/></svg>",
      'background-position-x': '176px',
      'background-position-y': '12px',
      'background-clip': 'node',
      'background-width': '12px',
      'background-height': '12px',
    },
  },
  {
    selector: 'node[state = "error"]',
    style: { 'border-color': '#e11d48' },
  },
  {
    selector: 'edge',
    style: {
      width: 2,
      'line-color': '#7c3aed',
      'target-arrow-color': '#7c3aed',
      'target-arrow-shape': 'triangle',
      'arrow-scale': 1.15,
      'curve-style': 'unbundled-bezier',
      'control-point-distance': 56,
      'control-point-weight': 0.5,
      opacity: 0.85,
    } as any,
  },
  {
    selector: 'edge:selected',
    style: { 'line-color': '#a78bfa', 'target-arrow-color': '#a78bfa', width: 3 },
  },
];

interface PipelineNode {
  id: string;
  type: string;
  label: string;
  desc: string;
  state?: string;
  disabled?: boolean;
  position?: { x: number; y: number };
}

interface PipelineEdge {
  id: string;
  source: string;
  target: string;
}

interface PipelineCytoCanvasProps {
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  selectedNodeId: string | null;
  onNodeSelect: (id: string | null) => void;
  onConnect: (sourceId: string, targetId: string) => void;
  onNodeDelete: (id: string) => void;
  onEdgeDelete: (id: string) => void;
  onNodeToggleDisabled: (id: string) => void;
  onPositionChange?: (id: string, position: { x: number; y: number }) => void;
}

export default function PipelineCytoCanvas({
  nodes,
  edges,
  selectedNodeId,
  onNodeSelect,
  onConnect,
  onNodeDelete,
  onEdgeDelete,
  onNodeToggleDisabled,
  onPositionChange,
}: PipelineCytoCanvasProps) {
  const { t } = useTranslation();
  const [actionMenu, setActionMenu] = useState<
    | { type: 'node'; id: string; x: number; y: number; disabled: boolean }
    | { type: 'edge'; id: string; x: number; y: number }
    | null
  >(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const tempPathRef = useRef<SVGPathElement>(null);
  const dragConnectionRef = useRef<{ sourceId: string; start: { x: number; y: number } } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: [],
      style: buildStylesheet(),
      layout: { name: 'preset' },
      minZoom: 0.15,
      maxZoom: 3,
      wheelSensitivity: 0.3,
    });

    cyRef.current = cy;

    const pointFromEvent = (event: PointerEvent | MouseEvent) => {
      const rect = containerRef.current!.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };

    const nodeAtPoint = (point: { x: number; y: number }) =>
      cy.nodes().filter((node) => {
        const box = node.renderedBoundingBox({ includeLabels: false, includeOverlays: false });
        return point.x >= box.x1 && point.x <= box.x2 && point.y >= box.y1 && point.y <= box.y2;
      })[0];

    const setTempPath = (end: { x: number; y: number }) => {
      const current = dragConnectionRef.current;
      if (!current || !tempPathRef.current) return;
      const dx = Math.max(80, Math.abs(end.x - current.start.x) * 0.5);
      tempPathRef.current.setAttribute('d', `M ${current.start.x} ${current.start.y} C ${current.start.x + dx} ${current.start.y}, ${end.x - dx} ${end.y}, ${end.x} ${end.y}`);
      tempPathRef.current.style.opacity = '1';
    };

    const clearConnection = () => {
      dragConnectionRef.current = null;
      setActionMenu(null);
      cy.autoungrabify(false);
      cy.nodes().removeClass('connection-source connection-target');
      if (tempPathRef.current) tempPathRef.current.style.opacity = '0';
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    const onPointerMove = (event: PointerEvent) => {
      const point = pointFromEvent(event);
      setTempPath(point);
      const target = nodeAtPoint(point);
      cy.nodes().removeClass('connection-target');
      if (target && target.id() !== dragConnectionRef.current?.sourceId) target.addClass('connection-target');
    };

    const onPointerUp = (event: PointerEvent) => {
      const current = dragConnectionRef.current;
      const target = nodeAtPoint(pointFromEvent(event));
      if (current && target && target.id() !== current.sourceId) onConnect(current.sourceId, target.id());
      clearConnection();
    };

    cy.on('tap', 'node', (e) => {
      const targetId = e.target.id();
      clearConnection();
      onNodeSelect(targetId);
    });

    cy.on('tap', 'edge', () => {
      clearConnection();
    });

    cy.on('tap', (e) => {
      if (e.target !== cy) return;
      clearConnection();
      onNodeSelect(null);
    });

    cy.on('dragfree', 'node', (e) => {
      setActionMenu(null);
      if (dragConnectionRef.current) return;
      const pos = e.target.position();
      onPositionChange?.(e.target.id(), { x: pos.x, y: pos.y });
    });

    cy.on('mousedown', 'node', (e) => {
      const original = e.originalEvent as MouseEvent;
      if (original.button !== 0) return;
      const node = e.target;
      const box = node.renderedBoundingBox({ includeLabels: false, includeOverlays: false });
      const point = e.renderedPosition || pointFromEvent(original);
      if (point.x < box.x2 - 28) return;
      original.preventDefault();
      original.stopPropagation();
      setActionMenu(null);
      clearConnection();
      const start = { x: box.x2, y: (box.y1 + box.y2) / 2 };
      dragConnectionRef.current = { sourceId: node.id(), start };
      cy.autoungrabify(true);
      node.addClass('connection-source');
      setTempPath(point);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    });

    cy.on('cxttap', 'node', (e) => {
      e.originalEvent?.preventDefault?.();
      e.originalEvent?.stopPropagation?.();
      clearConnection();
      const node = e.target;
      onNodeSelect(node.id());
      setActionMenu({
        type: 'node',
        id: node.id(),
        x: e.renderedPosition.x,
        y: e.renderedPosition.y,
        disabled: !!node.hasClass('disabled'),
      });
    });

    cy.on('cxttap', 'edge', (e) => {
      e.originalEvent?.preventDefault?.();
      e.originalEvent?.stopPropagation?.();
      clearConnection();
      setActionMenu({ type: 'edge', id: e.target.id(), x: e.renderedPosition.x, y: e.renderedPosition.y });
    });

    return () => {
      clearConnection();
      cy.destroy();
      cyRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    const existingNodeIds = new Set(cy.nodes().map((n) => n.id()));
    const existingEdgeIds = new Set(cy.edges().map((e) => e.id()));

    const incomingNodeIds = new Set(nodes.map((n) => n.id));
    const incomingEdgeIds = new Set(edges.map((e) => e.id));

    cy.nodes().forEach((n) => {
      if (!incomingNodeIds.has(n.id())) n.remove();
    });
    cy.edges().forEach((e) => {
      if (!incomingEdgeIds.has(e.id())) e.remove();
    });

    let needLayout = false;
    nodes.forEach((node) => {
      const category = getCategory(node.type);
      if (existingNodeIds.has(node.id)) {
        const cyNode = cy.getElementById(node.id);
        cyNode.data({ label: node.label, category, state: node.state || 'idle', disabled: !!node.disabled });
        if (node.disabled) cyNode.addClass('disabled');
        else cyNode.removeClass('disabled');
      } else {
        cy.add({
          group: 'nodes',
          data: { id: node.id, label: node.label, category, state: node.state || 'idle', nodeType: node.type, disabled: !!node.disabled },
          classes: node.disabled ? 'disabled' : '',
          position: node.position ?? { x: 300, y: 300 },
        });
        needLayout = !node.position;
      }
    });

    edges.forEach((edge) => {
      if (!existingEdgeIds.has(edge.id)) {
        cy.add({
          group: 'edges',
          data: { id: edge.id, source: edge.source, target: edge.target },
        });
        needLayout = true;
      }
    });

    if (needLayout) {
      (cy.layout({
        name: 'breadthfirst',
        directed: true,
        circle: false,
        spacingFactor: 1.25,
        padding: 40,
        animate: true,
        animationDuration: 300,
        transform: (_node: cytoscape.NodeSingular, position: cytoscape.Position) => ({ x: position.y, y: position.x }),
      } as any)).run();
    }
  }, [nodes, edges]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.nodes().unselect();
    if (selectedNodeId) {
      cy.getElementById(selectedNodeId).select();
    }
  }, [selectedNodeId]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 6 }}>
        <defs>
          <filter id="pipeline-edge-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <marker id="pipeline-temp-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="strokeWidth">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#a78bfa" />
          </marker>
        </defs>
        <path ref={tempPathRef} fill="none" stroke="#a78bfa" strokeWidth="3" markerEnd="url(#pipeline-temp-arrow)" filter="url(#pipeline-edge-glow)" style={{ opacity: 0, transition: 'opacity 0.12s ease' }} />
      </svg>

      {actionMenu && (
        <div
          style={{
            position: 'absolute',
            left: Math.min(actionMenu.x + 12, Math.max(12, (containerRef.current?.clientWidth || 0) - 172)),
            top: Math.min(actionMenu.y + 12, Math.max(12, (containerRef.current?.clientHeight || 0) - 92)),
            zIndex: 20,
            minWidth: 148,
            padding: '0.35rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-surface-hover)',
            borderRadius: 'var(--radius-sm)',
            boxShadow: '0 14px 36px rgba(0,0,0,0.32)',
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {actionMenu.type === 'node' ? (
            <>
              <button
                type="button"
                onClick={() => {
                  onNodeToggleDisabled(actionMenu.id);
                  setActionMenu(null);
                }}
                style={menuButtonStyle}
              >
                {actionMenu.disabled ? t('pipeline.node.activate') : t('pipeline.node.deactivate')}
              </button>
              <button
                type="button"
                onClick={() => {
                  onNodeDelete(actionMenu.id);
                  setActionMenu(null);
                }}
                style={{ ...menuButtonStyle, color: 'var(--color-error)' }}
              >
                {t('pipeline.node.delete')}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                onEdgeDelete(actionMenu.id);
                setActionMenu(null);
              }}
              style={{ ...menuButtonStyle, color: 'var(--color-error)' }}
            >
              {t('pipeline.edge.delete')}
            </button>
          )}
        </div>
      )}

      <ZoomControls
        onZoomIn={() => cyRef.current?.zoom(cyRef.current.zoom() * 1.2)}
        onZoomOut={() => cyRef.current?.zoom(cyRef.current.zoom() / 1.2)}
        onFit={() => cyRef.current?.fit(undefined, 40)}
      />

      <div style={{
        position: 'absolute', bottom: 20, left: 20,
        fontSize: '0.6875rem', color: 'var(--color-text-muted)',
        background: 'var(--color-surface)', border: '1px solid var(--color-surface-raised)',
        borderRadius: 'var(--radius-sm)', padding: '0.375rem 0.625rem',
        zIndex: 10,
      }}>
        {t('pipeline.canvas.connect_hint')}
      </div>
    </div>
  );
}
