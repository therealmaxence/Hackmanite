import { NodeHandler } from '../../executor';
import { requireGraphInput } from '../shared';
import { pruneGraphByNodes } from './shared';

export const edgeWeightThresholdHandler: NodeHandler = {
  type: 'filter.edge_weight_threshold',
  async run(inputs, config, context) {
    const input = requireGraphInput(inputs);
    const min = Math.max(0, Number(config?.min ?? 0.1) || 0);
    const edges = input.edges.filter((edge: any) => Number(edge.weight ?? 0) >= min);
    const connectedIds = new Set(edges.flatMap((edge: any) => [edge.source, edge.target]));
    await context.log(`Filtering edges with weight >= ${min}`);
    return { ...pruneGraphByNodes(input, input.nodes.filter((node: any) => connectedIds.has(node.id)), context), edges };
  },
};
