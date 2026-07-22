import { useEffect } from 'react';
import cytoscape from 'cytoscape';

interface UseCytoscapeSelectionProps {
  cy: cytoscape.Core | null;
  selectedNodeIds: string[];
}

export function useCytoscapeSelection({
  cy,
  selectedNodeIds,
}: UseCytoscapeSelectionProps) {
  useEffect(() => {
    if (!cy) return;

    const cySelectedIds = cy.nodes(':selected').map((n: cytoscape.NodeSingular) => n.id());
    const match =
      cySelectedIds.length === selectedNodeIds.length &&
      cySelectedIds.every((id) => selectedNodeIds.includes(id));
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
          cy.animate(
            {
              center: { eles: node },
              zoom: Math.max(cy.zoom(), 1.2),
            },
            {
              duration: 500,
              easing: 'ease-in-out-cubic',
            }
          );
        }
      }
    }
  }, [cy, selectedNodeIds]);
}
