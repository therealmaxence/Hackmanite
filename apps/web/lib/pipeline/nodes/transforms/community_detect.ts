import { NodeHandler } from '../../executor';
import { computeGraphCommunities } from '@/lib/graphCommunities';
import { requireGraphInput } from '../shared';
import { enrichNodeMetadata } from './shared';

export const communityDetectHandler: NodeHandler = {
  type: 'transform.community_detect',
  async run(inputs, _config, context) {
    const input = requireGraphInput(inputs);
    await context.log('Calculating modular community detection labels...');
    const communityLabels = computeGraphCommunities(input.nodes, input.edges);
    await context.log(`Completed community detection over ${input.nodes.length} nodes.`);
    return { type: 'graph' as const, nodes: input.nodes.map((node: any) => enrichNodeMetadata(node, { community: communityLabels.get(node.id) || 'isolated' })), edges: input.edges, emails: input.emails || [] };
  },
};
