import { NodeHandler } from '../../executor';
import { requireGraphInput } from '../shared';
import { computeDegreeMap, getMetricValue, pruneGraphByNodes } from './shared';

export const topNNodesHandler: NodeHandler = {
  type: 'filter.top_n_nodes',
  async run(inputs, config, context) {
    const input = requireGraphInput(inputs);
    const limit = parseInt(config?.limit) || 50;
    const metric = config?.metric || 'tfidf';

    await context.log(`Pruning graph: keeping top ${limit} nodes based on metric: ${metric}`);
    const degreeMap = computeDegreeMap(input.nodes, input.edges);
    const topNodes = [...input.nodes].sort((a, b) => getMetricValue(b, metric, degreeMap) - getMetricValue(a, metric, degreeMap)).slice(0, limit);
    return pruneGraphByNodes(input, topNodes, context);
  },
};
