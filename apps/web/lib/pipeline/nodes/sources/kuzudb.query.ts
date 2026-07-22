import { NodeHandler } from '../../executor';
import { NLP_URL } from '@/lib/nlp-url';
import { serializeRow } from './shared';

export const kuzuDbQueryHandler: NodeHandler = {
  type: 'source.kuzudb.query',
  async run(_, config, context) {
    let query = config?.query;
    if (!query || typeof query !== 'string') throw new Error('Missing parameter: query');
    if (context.isDryRun && !/limit\s+\d+/i.test(query)) query = `${query} LIMIT 50`;
    await context.log(`Executing Cypher query: ${query.substring(0, 100)}...`);
    const res = await fetch(`${NLP_URL}/graph/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Graph query failed: ${res.statusText}`);
    }
    const { rows } = await res.json();
    return { type: 'tabular', data: (rows || []).map(serializeRow) };
  },
};
