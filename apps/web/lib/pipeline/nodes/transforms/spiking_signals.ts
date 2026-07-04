import { buildWeakSignalHandler } from './shared';

export const spikingSignalsHandler = buildWeakSignalHandler(
  'transform.spiking_signals',
  'Calculating Spiking Signals (sliding window concentration)...',
  'Spiking Signals',
  'spikingSignalsScore',
  ({ emergingSignals }) => emergingSignals
);
