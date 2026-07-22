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

    const values = new Map<string, number>();
    for (const node of input.nodes) {
      values.set(node.id, getMetricValue(node, metric, degreeMap));
    }

    const topNodes = [...input.nodes]
      .sort((a, b) => (values.get(b.id) ?? 0) - (values.get(a.id) ?? 0))
      .slice(0, limit);

    return pruneGraphByNodes(input, topNodes, context);
  },
};
