import { GraphData, PipelineData } from '../executor';

export function requireInput(inputs: Record<string, PipelineData>, id = 'input'): PipelineData {
  const input = inputs[id];
  if (!input) throw new Error(`Input port "${id}" is missing`);
  return input;
}

export function requireGraphInput(inputs: Record<string, PipelineData>, id = 'input'): GraphData {
  const input = inputs[id];
  if (!input || input.type !== 'graph') throw new Error('Input is missing or is not of type "graph"');
  return input;
}
