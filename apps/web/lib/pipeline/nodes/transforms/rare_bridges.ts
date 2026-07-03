import { buildWeakSignalHandler } from './shared';

export const rareBridgesHandler = buildWeakSignalHandler(
  'transform.rare_bridges',
  'Calculating Rare Bridges signals...',
  'Rare Bridges',
  ({ bridgeSignals }) => bridgeSignals
);
