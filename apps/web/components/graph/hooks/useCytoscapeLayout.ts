import { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import { getLayoutConfig } from '../utils/layoutHelpers';

interface UseCytoscapeLayoutProps {
  cy: cytoscape.Core | null;
  nodesCount: number;
  layout: string;
  layoutTrigger: number;
}

export function useCytoscapeLayout({
  cy,
  nodesCount,
  layout,
  layoutTrigger,
}: UseCytoscapeLayoutProps) {
  const activeLayoutRef = useRef<any>(null);

  useEffect(() => {
    if (!cy || cy.nodes().length === 0) return;

    if (activeLayoutRef.current) {
      try {
        activeLayoutRef.current.stop();
      } catch (e) {}
    }

    const forceRandomize = layoutTrigger > 0;
    const isInitialBatch = nodesCount <= 100;
    const config = getLayoutConfig(layout, nodesCount, isInitialBatch);
    if (forceRandomize && layout === 'cose-bilkent') {
      config.randomize = true;
    }

    const instance = cy.layout(config);
    activeLayoutRef.current = instance;

    instance.one('layoutstop', () => {
      if (activeLayoutRef.current === instance) {
        activeLayoutRef.current = null;
      }
    });

    instance.run();

    return () => {
      if (activeLayoutRef.current) {
        try {
          activeLayoutRef.current.stop();
        } catch (e) {}
        activeLayoutRef.current = null;
      }
    };
  }, [cy, layout, layoutTrigger, nodesCount]);
}
