import { entityCategoryHandler } from './entity_category';
import { allowDenyListHandler } from './allow_deny_list';
import { topNNodesHandler } from './top_n_nodes';
import { minTfidfHandler } from './min_tfidf';
import { minOccurrencesHandler } from './min_occurrences';
import { minConnectionsHandler } from './min_connections';
import { edgeWeightThresholdHandler } from './edge_weight_threshold';
import { weakSignalFlagHandler } from './weak_signal_flag';

export const handlers = [
  entityCategoryHandler,
  allowDenyListHandler,
  topNNodesHandler,
  minTfidfHandler,
  minOccurrencesHandler,
  minConnectionsHandler,
  edgeWeightThresholdHandler,
  weakSignalFlagHandler,
];
