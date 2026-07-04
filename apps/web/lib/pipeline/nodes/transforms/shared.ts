import { NodeHandler } from '../../executor';
import { computeWeakSignals, WeakSignalsResult } from '../../weakSignals';
import { requireGraphInput } from '../shared';

export function enrichNodeMetadata(node: any, fields: any) {
  const meta = node.metadata ? (typeof node.metadata === 'string' ? JSON.parse(node.metadata) : node.metadata) : {};
  return { ...node, metadata: JSON.stringify({ ...meta, ...fields }) };
}

export function enrichSignals(input: any, signals: any[], metricKey: string) {
  const signalMap = new Map(signals.map((signal) => [signal.id, signal.score || 0] as const));
  return {
    type: 'graph' as const,
    nodes: input.nodes.map((node: any) => {
      const score = signalMap.get(node.id) || 0;
      return enrichNodeMetadata({ ...node, score }, { [metricKey]: score });
    }),
    edges: input.edges,
    emails: input.emails || [],
  };
}

export function buildWeakSignalHandler(
  type: string,
  startMessage: string,
  resultLabel: string,
  metricKey: string,
  pickSignals: (result: WeakSignalsResult) => any[]
): NodeHandler {
  return {
    type,
    async run(inputs, config, context) {
      const input = requireGraphInput(inputs);
      await context.log(startMessage);
      const result = enrichSignals(input, pickSignals(computeWeakSignals(input, config || {})), metricKey);
      await context.log(`Enriched graph with ${resultLabel} scores.`);
      return result;
    },
  };
}
