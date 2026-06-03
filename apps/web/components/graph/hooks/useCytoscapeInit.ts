import { useEffect, useState } from 'react';
import cytoscape from 'cytoscape';
import { cytoscapeStylesheet } from '@/lib/graph-builder';
import { useGraphStore } from '@/store/graphStore';

interface UseCytoscapeInitProps {
  containerRef: React.RefObject<HTMLDivElement>;
  onNodeExpand?: (nodeId: string) => void;
  renderedNodeIds: React.MutableRefObject<Set<string>>;
  renderedEdgeKeys: React.MutableRefObject<Set<string>>;
  onNodeRightClick?: (nodeId: string, nodeType: string, nodeLabel: string, x: number, y: number) => void;
  onCanvasTap?: () => void;
}

export function useCytoscapeInit({
  containerRef,
  onNodeExpand,
  renderedNodeIds,
  renderedEdgeKeys,
  onNodeRightClick,
  onCanvasTap,
}: UseCytoscapeInitProps) {
  const [cy, setCy] = useState<cytoscape.Core | null>(null);
  const { selectNode, setSelectedNodeIds } = useGraphStore();

  useEffect(() => {
    if (!containerRef.current) return;

    const instance = cytoscape({
      container: containerRef.current,
      elements: [],
      style: cytoscapeStylesheet,
      minZoom: 0.1,
      maxZoom: 4,
      wheelSensitivity: 0.3,
    });

    setCy(instance);

    instance.on('tap', 'node', (e) => {
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
      onCanvasTap?.();
    });

    instance.on('tap', (e) => {
      if (e.target === instance) {
        instance.elements().removeClass('faded highlighted');
        setSelectedNodeIds([]);
      }
      onCanvasTap?.();
    });

    instance.on('dbltap', 'node', (e) => {
      onNodeExpand?.(e.target.id());
      instance.fit(e.target.closedNeighborhood(), 60);
    });

    instance.on('cxttap', 'node', (e) => {
      e.preventDefault();
      const node = e.target;
      const nodeId = node.id();
      const data = node.data();
      const type = data.type;
      const label = data.fullLabel || data.label;
      const origEvent = e.originalEvent;
      const x = origEvent.clientX || origEvent.pageX;
      const y = origEvent.clientY || origEvent.pageY;
      onNodeRightClick?.(nodeId, type, label, x, y);
    });

    instance.on('cxttap', (e) => {
      if (e.target === instance) {
        onCanvasTap?.();
      }
    });

    const handleZoom = () => {
      if (instance.zoom() < 0.35) {
        instance.nodes().addClass('hide-label');
      } else {
        instance.nodes().removeClass('hide-label');
      }
    };
    instance.on('zoom', handleZoom);

    return () => {
      instance.off('zoom', handleZoom);
      instance.destroy();
      setCy(null);
      renderedNodeIds.current.clear();
      renderedEdgeKeys.current.clear();
    };
  }, [containerRef, onNodeExpand, selectNode, setSelectedNodeIds, renderedNodeIds, renderedEdgeKeys, onNodeRightClick, onCanvasTap]);

  return cy;
}
