import { NodeHandler } from '../../executor';
import { requireGraphInput } from '../shared';
import { pruneGraphByNodes } from './shared';

export const dateRangeFilterHandler: NodeHandler = {
  type: 'filter.date_range',
  async run(inputs, config, context) {
    const input = requireGraphInput(inputs);
    const start = config?.startDate ? new Date(config.startDate).getTime() : null;
    const end = config?.endDate ? new Date(config.endDate).getTime() : null;

    if (!start && !end) {
      await context.log('No date range specified. Passing through graph unchanged.');
      return input;
    }

    await context.log(`Filtering graph by date range: ${config?.startDate || '*'} to ${config?.endDate || '*'}`);

    const filteredNodes = input.nodes.map((node: any) => {
      const occurrences = (node.occurrences || []).filter((occ: any) => {
        if (!occ.originalCreatedAt) return true;
        const t = new Date(occ.originalCreatedAt).getTime();
        if (start && t < start) return false;
        if (end && t > end) return false;
        return true;
      });
      return { ...node, occurrences };
    }).filter((node: any) => node.occurrences.length > 0);

    return pruneGraphByNodes(input, filteredNodes, context);
  },
};
