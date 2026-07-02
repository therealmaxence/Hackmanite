import { NodeHandler } from '../executor';
import { prisma } from '@/lib/prisma';

export const handler: NodeHandler = {
  type: 'source.sqlite.query',
  async run(_, config, context) {
    let query = config?.query;
    if (!query || typeof query !== 'string') {
      throw new Error('Missing parameter: query');
    }
    if (context.isDryRun) {
      if (!/limit\s+\d+/i.test(query)) {
        query = `${query} LIMIT 50`;
      }
    }
    await context.log(`Executing raw SQLite query: ${query.substring(0, 100)}...`);
    const results = await prisma.$queryRawUnsafe<any[]>(query);
    const serialized = results.map((row) => {
      const obj: any = {};
      for (const key of Object.keys(row)) {
        const val = row[key];
        obj[key] = typeof val === 'bigint' ? Number(val) : val;
      }
      return obj;
    });
    return {
      type: 'tabular',
      data: serialized,
    };
  },
};
