import { buildThresholdFilterHandler, getTfidfValue } from './shared';

export const minTfidfHandler = buildThresholdFilterHandler(
  'filter.min_tfidf',
  'Filtering entities with TF-IDF',
  (node) => getTfidfValue(node),
  1
);
