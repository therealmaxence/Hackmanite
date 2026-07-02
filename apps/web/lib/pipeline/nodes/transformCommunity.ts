import { NodeHandler } from '../executor';
import { computeGraphCommunities } from '@/lib/graphCommunities';

export const handler: NodeHandler = {
  type: 'transform.community_detect',
  async run(inputs, config, context) {
    const input = inputs.input;
    if (!input || input.type !== 'graph') {
      throw new Error('Input is missing or is not of type "graph"');
    }

    await context.log('Calculating modular community detection labels...');
    const communityLabels = computeGraphCommunities(input.nodes, input.edges);

    const enrichedNodes = input.nodes.map((n) => {
      const community = communityLabels.get(n.id) || 'isolated';
      const metadata = n.metadata
        ? typeof n.metadata === 'string'
          ? JSON.parse(n.metadata)
          : n.metadata
        : {};
      return {
        ...n,
        metadata: JSON.stringify({ ...metadata, community }),
      };
    });

    await context.log(`Completed community detection over ${input.nodes.length} nodes.`);

    return {
      type: 'graph',
      nodes: enrichedNodes,
      edges: input.edges,
      emails: input.emails || [],
    };
  },
};
