import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

interface StatsOptions {
  sessionId: string;
  types: string[];
  search: string;
  limit: number;
}

const serialize = (obj: unknown) =>
  JSON.parse(JSON.stringify(obj, (_k, v) => (typeof v === 'bigint' ? Number(v) : v)));

export async function getSessionStats({ sessionId, types, search, limit }: StatsOptions) {
  const typeFilter = types.length > 0 ? types : undefined;
  const searchFilter = search ? { contains: search } : undefined;

  const [fileStats, totalEntities, totalOccurrences] = await Promise.all([
    prisma.file.aggregate({
      where: { sessionId },
      _count: { id: true },
      _sum: { sizeBytes: true },
      _avg: { sizeBytes: true },
    }),
    prisma.entity.count({
      where: {
        occurrences: { some: { file: { sessionId } } },
        type: typeFilter ? { in: typeFilter as any } : undefined,
        canonical: searchFilter,
      },
    }),
    prisma.occurrence.aggregate({
      where: {
        file: { sessionId },
        entity: {
          type: typeFilter ? { in: typeFilter as any } : undefined,
          canonical: searchFilter,
        },
      },
      _sum: { count: true },
    }),
  ]);

  const typeFilterSql = types.length > 0 ? Prisma.sql`AND e.type IN (${Prisma.join(types)})` : Prisma.empty;
  const searchFilterSql = search ? Prisma.sql`AND e.canonical LIKE ${`%%${search}%%`}` : Prisma.empty;

  const [topEntitiesRaw, typeDistributionRaw, fileTypeDistributionRaw] = await Promise.all([
    prisma.$queryRaw<any[]>`
      SELECT e.displayName as label, e.type, SUM(o.count) as count
      FROM entities e
      JOIN occurrences o ON o.entityId = e.id
      JOIN files f ON f.id = o.fileId
      WHERE f.sessionId = ${sessionId}
      ${typeFilterSql}
      ${searchFilterSql}
      GROUP BY e.id, e.displayName, e.type
      ORDER BY count DESC
      LIMIT ${limit}
    `,
    prisma.$queryRaw<any[]>`
      SELECT e.type, COUNT(DISTINCT e.id) as count
      FROM entities e
      JOIN occurrences o ON o.entityId = e.id
      JOIN files f ON f.id = o.fileId
      WHERE f.sessionId = ${sessionId}
      ${typeFilterSql}
      ${searchFilterSql}
      GROUP BY e.type
    `,
    prisma.$queryRaw<any[]>`
      SELECT mimeType, COUNT(id) as count
      FROM files
      WHERE sessionId = ${sessionId}
      GROUP BY mimeType
    `,
  ]);

  return serialize({
    general: {
      totalFiles: fileStats._count.id,
      totalSize: fileStats._sum.sizeBytes || 0,
      avgSize: fileStats._avg.sizeBytes || 0,
      totalEntities,
      totalOccurrences: totalOccurrences._sum.count || 0,
    },
    topEntities: topEntitiesRaw.map((e) => ({ ...e, count: Number(e.count) })),
    entityTypeDistribution: typeDistributionRaw.map((e) => ({ ...e, count: Number(e.count) })),
    fileTypeDistribution: fileTypeDistributionRaw.map((e) => ({ ...e, count: Number(e.count) })),
  });
}
