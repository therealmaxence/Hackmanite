import { NodeHandler } from '../../executor';
import { requireGraphInput } from '../shared';
import { computeDegreeMap, pruneGraphByNodes } from './shared';

export const minConnectionsHandler: NodeHandler = {
  type: 'filter.min_connections',
  async run(inputs, config, context) {
    const input = requireGraphInput(inputs);
    const min = Math.max(0, Number(config?.min ?? 2) || 0);
    const degreeMap = computeDegreeMap(input.nodes, input.edges);
    await context.log(`Filtering entities with degree >= ${min}`);
    return pruneGraphByNodes(input, input.nodes.filter((node: any) => (degreeMap.get(node.id) || 0) >= min), context);
  },
};
