import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

interface StatsOptions {
  sessionId: string;
  types: string[];
  search: string;
  limit: number;
  tfidfLimit?: number;
}

const serialize = (obj: unknown) =>
  JSON.parse(JSON.stringify(obj, (_k, v) => (typeof v === 'bigint' ? Number(v) : v)));

export async function getSessionStats({ sessionId, types, search, limit, tfidfLimit }: StatsOptions) {
  const typeFilter = types.length > 0 ? types : undefined;
  const searchFilter = search ? { contains: search } : undefined;

  const sessionRecord = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { hiddenNodeIds: true },
  });
  const hiddenNodeIds: string[] = JSON.parse(sessionRecord?.hiddenNodeIds || '[]');

  const hiddenFilter = hiddenNodeIds.length > 0 ? { notIn: hiddenNodeIds } : undefined;

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
        id: hiddenFilter,
        type: typeFilter ? { in: typeFilter as any } : undefined,
        canonical: searchFilter,
      },
    }),
    prisma.occurrence.aggregate({
      where: {
        file: { sessionId },
        entityId: hiddenFilter,
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
  const hiddenSql = hiddenNodeIds.length > 0
    ? Prisma.sql`AND e.id NOT IN (${Prisma.join(hiddenNodeIds)})`
    : Prisma.empty;
  const hiddenOccursSql = hiddenNodeIds.length > 0
    ? Prisma.sql`AND o.entityId NOT IN (${Prisma.join(hiddenNodeIds)})`
    : Prisma.empty;
  const hiddenNeighborhoodSql = hiddenNodeIds.length > 0
    ? Prisma.sql`AND n.sourceEntityId NOT IN (${Prisma.join(hiddenNodeIds)}) AND n.targetEntityId NOT IN (${Prisma.join(hiddenNodeIds)})`
    : Prisma.empty;

  const [
    topEntitiesRaw, topEntitiesByTfidfRaw, typeDistributionRaw, fileTypeDistributionRaw,
    connectionStats, cooccurrencesRaw, emailDates, fileDates, emailHoursRaw, fileHoursRaw,
  ] = await Promise.all([
    prisma.$queryRaw<any[]>`
      SELECT e.displayName as label, e.type, SUM(o.count) as count
      FROM entities e JOIN occurrences o ON o.entityId = e.id JOIN files f ON f.id = o.fileId
      WHERE f.sessionId = ${sessionId} ${typeFilterSql} ${searchFilterSql} ${hiddenSql}
      GROUP BY e.id, e.displayName, e.type ORDER BY count DESC LIMIT ${limit}
    `,
    prisma.$queryRaw<any[]>`
      SELECT e.displayName as label, e.type, SUM(o.tfidf) as tfidf
      FROM entities e JOIN occurrences o ON o.entityId = e.id JOIN files f ON f.id = o.fileId
      WHERE f.sessionId = ${sessionId} ${typeFilterSql} ${searchFilterSql} ${hiddenSql}
      GROUP BY e.id, e.displayName, e.type ORDER BY tfidf DESC LIMIT ${tfidfLimit ?? limit}
    `,
    prisma.$queryRaw<any[]>`
      SELECT e.type, COUNT(DISTINCT e.id) as count
      FROM entities e JOIN occurrences o ON o.entityId = e.id JOIN files f ON f.id = o.fileId
      WHERE f.sessionId = ${sessionId} ${typeFilterSql} ${searchFilterSql} ${hiddenSql}
      GROUP BY e.type
    `,
    prisma.$queryRaw<any[]>`
      SELECT mimeType, COUNT(id) as count, SUM(sizeBytes) as totalSize
      FROM files WHERE sessionId = ${sessionId} GROUP BY mimeType
    `,
    prisma.$queryRaw<any[]>`
      SELECT SUM(CASE WHEN file_count > 1 THEN 1 ELSE 0 END) as sharedCount,
             SUM(CASE WHEN file_count = 1 THEN 1 ELSE 0 END) as uniqueCount
      FROM (
        SELECT entityId, COUNT(fileId) as file_count FROM occurrences o
        JOIN files f ON f.id = o.fileId WHERE f.sessionId = ${sessionId} ${hiddenOccursSql}
        GROUP BY entityId
      )
    `,
    prisma.$queryRaw<any[]>`
      SELECT e1.type as typeA, e2.type as typeB, COUNT(*) as count
      FROM entity_neighborhoods n JOIN entities e1 ON n.sourceEntityId = e1.id
      JOIN entities e2 ON n.targetEntityId = e2.id JOIN files f ON n.fileId = f.id
      WHERE f.sessionId = ${sessionId} AND e1.type <= e2.type ${hiddenNeighborhoodSql}
      GROUP BY typeA, typeB ORDER BY count DESC LIMIT 5
    `,
    prisma.$queryRaw<any[]>`
      SELECT MIN(e.date) as minDate, MAX(e.date) as maxDate FROM emails e
      JOIN files f ON f.id = e.fileId WHERE f.sessionId = ${sessionId} AND e.date IS NOT NULL
    `,
    prisma.$queryRaw<any[]>`
      SELECT MIN(originalCreatedAt) as minDate, MAX(originalCreatedAt) as maxDate
      FROM files WHERE sessionId = ${sessionId} AND originalCreatedAt IS NOT NULL
    `,
    prisma.$queryRaw<any[]>`
      SELECT STRFTIME('%H', e.date) as hourStr, COUNT(*) as count FROM emails e
      JOIN files f ON f.id = e.fileId WHERE f.sessionId = ${sessionId} AND e.date IS NOT NULL
      GROUP BY hourStr ORDER BY hourStr ASC
    `,
    prisma.$queryRaw<any[]>`
      SELECT STRFTIME('%H', uploadedAt) as hourStr, COUNT(*) as count
      FROM files WHERE sessionId = ${sessionId} GROUP BY hourStr ORDER BY hourStr ASC
    `,
  ]);

  const toHour = (r: any) => ({ hour: Number(r.hourStr), count: Number(r.count) });
  const minDate = emailDates[0]?.minDate || fileDates[0]?.minDate || null;
  const maxDate = emailDates[0]?.maxDate || fileDates[0]?.maxDate || null;

  return serialize({
    general: {
      totalFiles: fileStats._count.id,
      totalSize: fileStats._sum.sizeBytes || 0,
      avgSize: fileStats._avg.sizeBytes || 0,
      totalEntities,
      totalOccurrences: totalOccurrences._sum.count || 0,
    },
    topEntities: topEntitiesRaw.map((e) => ({ ...e, count: Number(e.count) })),
    topEntitiesByTfidf: topEntitiesByTfidfRaw.map((e) => ({ ...e, tfidf: Number(e.tfidf || 0) })),
    entityTypeDistribution: typeDistributionRaw.map((e) => ({ ...e, count: Number(e.count) })),
    fileTypeDistribution: fileTypeDistributionRaw.map((e) => ({
      ...e, count: Number(e.count), totalSize: Number(e.totalSize || 0),
    })),
    connectivity: {
      sharedEntitiesCount: Number(connectionStats[0]?.sharedCount || 0),
      uniqueEntitiesCount: Number(connectionStats[0]?.uniqueCount || 0),
    },
    cooccurrences: cooccurrencesRaw.map((c) => ({ typeA: c.typeA, typeB: c.typeB, count: Number(c.count) })),
    temporal: { minDate, maxDate, activityHours: (emailHoursRaw.length > 0 ? emailHoursRaw : fileHoursRaw).map(toHour) },
    density: {
      entitiesPerKb: fileStats._sum.sizeBytes
        ? Number(totalOccurrences._sum.count || 0) / (Number(fileStats._sum.sizeBytes) / 1024)
        : 0,
    },
  });
}
