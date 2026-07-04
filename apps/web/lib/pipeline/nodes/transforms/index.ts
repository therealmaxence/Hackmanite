import { centralityScoreHandler } from './centrality_score';
import { communityDetectHandler } from './community_detect';
import { rareBridgesHandler } from './rare_bridges';
import { nicheTopicsHandler } from './niche_topics';
import { spikingSignalsHandler } from './spiking_signals';
import { llmAnnotateHandler } from './llm_annotate';
import { entityResolverHandler } from './dedup';

export const handlers = [
  centralityScoreHandler,
  communityDetectHandler,
  rareBridgesHandler,
  nicheTopicsHandler,
  spikingSignalsHandler,
  llmAnnotateHandler,
  entityResolverHandler,
];
