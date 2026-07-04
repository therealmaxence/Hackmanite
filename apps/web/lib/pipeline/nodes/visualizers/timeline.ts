import { NodeHandler } from '../../executor';
import { requireGraphInput } from '../shared';

export const timelineVisualizerHandler: NodeHandler = {
  type: 'visualize.timeline',
  async run(inputs, _, context) {
    const input = requireGraphInput(inputs);
    await context.log(`Passing through graph data with ${input.nodes.length} nodes for timeline preview.`);
    return input;
  },
};
