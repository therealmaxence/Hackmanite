import { buildThresholdFilterHandler } from './shared';

export const minConnectionsHandler = buildThresholdFilterHandler(
  'filter.min_connections',
  'Filtering entities with degree',
  (node, degreeMap) => degreeMap.get(node.id) || 0,
  2,
  true
);
