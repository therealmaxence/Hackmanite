import { NodeHandler } from '../../executor';
import { computeWeakSignals, WeakSignalsResult } from '../../weakSignals';
import { requireGraphInput } from '../shared';

export function enrichNodeMetadata(node: any, fields: any) {
  const meta = node.metadata ? (typeof node.metadata === 'string' ? JSON.parse(node.metadata) : node.metadata) : {};
  return { ...node, metadata: JSON.stringify({ ...meta, ...fields }) };
}

export function extractSignals(input: any, signals: any[]) {
  const signalMap = new Map(signals.map((signal) => [signal.id, signal.score || 0] as const));
  return {
    type: 'graph' as const,
    nodes: input.nodes.filter((node: any) => signalMap.has(node.id)).map((node: any) => ({ ...node, score: signalMap.get(node.id) || 0 })),
    edges: input.edges.filter((edge: any) => signalMap.has(edge.source) && signalMap.has(edge.target)),
    emails: input.emails || [],
  };
}

export function buildWeakSignalHandler(
  type: string,
  startMessage: string,
  resultLabel: string,
  pickSignals: (result: WeakSignalsResult) => any[]
): NodeHandler {
  return {
    type,
    async run(inputs, config, context) {
      const input = requireGraphInput(inputs);
      await context.log(startMessage);
      const result = extractSignals(input, pickSignals(computeWeakSignals(input, config || {})));
      await context.log(`Extracted ${result.nodes.length} ${resultLabel} nodes from the graph.`);
      return result;
    },
  };
}
