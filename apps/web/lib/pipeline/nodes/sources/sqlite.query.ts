import { NodeHandler } from '../../executor';
import { prisma } from '@/lib/prisma';
import { serializeRow } from './shared';

export const sqliteQueryHandler: NodeHandler = {
  type: 'source.sqlite.query',
  async run(_, config, context) {
    let query = config?.query;
    if (!query || typeof query !== 'string') throw new Error('Missing parameter: query');
    if (context.isDryRun && !/limit\s+\d+/i.test(query)) query = `${query} LIMIT 50`;
    await context.log(`Executing raw SQLite query: ${query.substring(0, 100)}...`);
    const results = await prisma.$queryRawUnsafe<any[]>(query);
    return { type: 'tabular', data: results.map(serializeRow) };
  },
};
