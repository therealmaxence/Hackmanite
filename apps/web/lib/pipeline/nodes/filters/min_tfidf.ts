import { NodeHandler } from '../../executor';
import { requireGraphInput } from '../shared';
import { getTfidfValue, pruneGraphByNodes } from './shared';

export const minTfidfHandler: NodeHandler = {
  type: 'filter.min_tfidf',
  async run(inputs, config, context) {
    const input = requireGraphInput(inputs);
    const min = Math.max(0, Number(config?.min ?? config?.minTfidf ?? 1) || 0);
    await context.log(`Filtering entities with TF-IDF >= ${min}`);
    return pruneGraphByNodes(input, input.nodes.filter((node: any) => getTfidfValue(node) >= min), context);
  },
};
