import { buildWeakSignalHandler } from './shared';

export const nicheTopicsHandler = buildWeakSignalHandler(
  'transform.niche_topics',
  'Calculating Niche Topics signals...',
  'Niche Topics',
  ({ nicheSignals }) => nicheSignals
);
