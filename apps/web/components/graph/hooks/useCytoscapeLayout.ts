import { useEffect } from 'react';
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
  useEffect(() => {
    if (!cy || cy.nodes().length === 0) return;

    const forceRandomize = layoutTrigger > 0;
    const config = getLayoutConfig(layout, nodesCount, true);
    if (forceRandomize && layout === 'cose-bilkent') {
      config.randomize = true;
    }

    cy.layout(config).run();
  }, [cy, layout, layoutTrigger, nodesCount]);
}
