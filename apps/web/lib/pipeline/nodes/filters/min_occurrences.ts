import { buildThresholdFilterHandler, getOccurrenceCount } from './shared';

export const minOccurrencesHandler = buildThresholdFilterHandler(
  'filter.min_occurrences',
  'Filtering entities with occurrence count',
  (node) => getOccurrenceCount(node),
  2
);
