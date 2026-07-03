import { NodeHandler } from '../../executor';
import { requireGraphInput } from '../shared';

export const graphVisualizerHandler: NodeHandler = {
  type: 'visualize.graph',
  async run(inputs, _, context) {
    const input = requireGraphInput(inputs);
    await context.log(`Passing through graph data with ${input.nodes.length} nodes for visual preview.`);
    return input;
  },
};
