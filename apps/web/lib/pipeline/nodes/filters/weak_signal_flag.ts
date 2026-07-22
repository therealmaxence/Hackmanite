import { NodeHandler } from '../../executor';
import { computeWeakSignals } from '../../weakSignals';
import { requireGraphInput } from '../shared';
import { pruneGraphByNodes } from './shared';

export const weakSignalFlagHandler: NodeHandler = {
  type: 'filter.weak_signal_flag',
  async run(inputs, config, context) {
    const input = requireGraphInput(inputs);
    const selectedSignals = new Set<string>();
    const signals = computeWeakSignals(input, config || {});
    if (config?.rareBridges !== false) signals.bridgeSignals.forEach((signal) => selectedSignals.add(signal.id));
    if (config?.nicheTopics !== false) signals.nicheSignals.forEach((signal) => selectedSignals.add(signal.id));
    if (config?.spikingSignals !== false) signals.emergingSignals.forEach((signal) => selectedSignals.add(signal.id));

    await context.log(`Filtering entities flagged as weak signals (${selectedSignals.size} matched).`);
    return pruneGraphByNodes(input, input.nodes.filter((node: any) => selectedSignals.has(node.id)), context);
  },
};
