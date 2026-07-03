import { NodeHandler } from '../../executor';

export const tableVisualizerHandler: NodeHandler = {
  type: 'visualize.table',
  async run(inputs, _, context) {
    const input = inputs.input;
    if (!input || (input.type !== 'tabular' && input.type !== 'graph')) {
      throw new Error('Input is missing or is not of type "tabular" or "graph"');
    }
    if (input.type === 'graph') await context.log(`Passing through graph entities list with ${input.nodes.length} nodes for table preview.`);
    else await context.log(`Passing through tabular dataset with ${input.data.length} records for preview.`);
    return input;
  },
};
