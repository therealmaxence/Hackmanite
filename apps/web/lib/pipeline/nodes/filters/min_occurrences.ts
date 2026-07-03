import { NodeHandler } from '../../executor';
import { requireGraphInput } from '../shared';
import { getOccurrenceCount, pruneGraphByNodes } from './shared';

export const minOccurrencesHandler: NodeHandler = {
  type: 'filter.min_occurrences',
  async run(inputs, config, context) {
    const input = requireGraphInput(inputs);
    const min = Math.max(0, Number(config?.min ?? 2) || 0);
    await context.log(`Filtering entities with occurrence count >= ${min}`);
    return pruneGraphByNodes(input, input.nodes.filter((node: any) => getOccurrenceCount(node) >= min), context);
  },
};
