import { NodeHandler } from '../../executor';
import { brandes, buildAdj } from '@/lib/brandes';
import { requireGraphInput } from '../shared';
import { enrichNodeMetadata } from './shared';

export const centralityScoreHandler: NodeHandler = {
  type: 'transform.centrality_score',
  async run(inputs, _config, context) {
    const input = requireGraphInput(inputs);
    await context.log('Calculating Brandes betweenness centrality scores...');
    const nodeIds = input.nodes.map((node: any) => node.id);
    const adj = buildAdj(new Set(nodeIds), input.edges.map((edge: any) => ({ sourceEntityId: edge.source, targetEntityId: edge.target })));
    const centrality = brandes(nodeIds, adj);
    await context.log(`Centrality scores populated for all ${input.nodes.length} nodes.`);
    return { type: 'graph' as const, nodes: input.nodes.map((node: any) => enrichNodeMetadata(node, { centralityScore: centrality.get(node.id) || 0 })), edges: input.edges, emails: input.emails || [] };
  },
};
