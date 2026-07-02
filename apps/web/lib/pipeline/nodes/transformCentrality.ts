import { NodeHandler } from '../executor';
import { brandes, buildAdj } from '@/lib/brandes';

export const handler: NodeHandler = {
  type: 'transform.centrality_score',
  async run(inputs, config, context) {
    const input = inputs.input;
    if (!input || input.type !== 'graph') {
      throw new Error('Input is missing or is not of type "graph"');
    }

    await context.log('Calculating Brandes betweenness centrality scores...');
    const nodeIds = input.nodes.map((n) => n.id);
    const adj = buildAdj(
      new Set(nodeIds),
      input.edges.map((e) => ({ sourceEntityId: e.source, targetEntityId: e.target }))
    );
    const centrality = brandes(nodeIds, adj);

    const enrichedNodes = input.nodes.map((n) => {
      const score = centrality.get(n.id) || 0;
      const metadata = n.metadata
        ? typeof n.metadata === 'string'
          ? JSON.parse(n.metadata)
          : n.metadata
        : {};
      return {
        ...n,
        metadata: JSON.stringify({ ...metadata, centralityScore: score }),
      };
    });

    await context.log(`Centrality scores populated for all ${input.nodes.length} nodes.`);

    return {
      type: 'graph',
      nodes: enrichedNodes,
      edges: input.edges,
      emails: input.emails || [],
    };
  },
};
