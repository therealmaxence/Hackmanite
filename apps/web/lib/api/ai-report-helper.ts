import { prisma } from '@/lib/prisma';
import { brandes, buildAdj } from '@/lib/brandes';

export interface AiReportData {
  general: {
    totalFiles: number;
    totalSize: number;
    totalEntities: number;
    totalOccurrences: number;
  };
  fileTypes: Array<{ mimeType: string; count: number }>;
  entityTypes: Array<{ type: string; count: number }>;
  topEntities: Array<{ label: string; type: string; count: number }>;
  topTfidfEntities: Array<{ label: string; type: string; tfidf: number }>;
  cooccurrences: Array<{ typeA: string; typeB: string; count: number }>;
  bridges: Array<{ label: string; type: string; score: number }>;
}

export async function getAiReportData(sessionId: string): Promise<AiReportData> {
  const [fileStats, totalEntities, totalOccurrences] = await Promise.all([
    prisma.file.aggregate({
      where: { sessionId },
      _count: { id: true },
      _sum: { sizeBytes: true },
    }),
    prisma.entity.count({
      where: { occurrences: { some: { file: { sessionId } } } },
    }),
    prisma.occurrence.aggregate({
      where: { file: { sessionId } },
      _sum: { count: true },
    }),
  ]);

  const [
    fileTypes,
    entityTypes,
    topEntities,
    topTfidfEntities,
    cooccurrencesRaw,
    topEntitiesForBridges,
  ] = await Promise.all([
    prisma.file.groupBy({
      by: ['mimeType'],
      where: { sessionId },
      _count: { id: true },
    }),
    prisma.$queryRaw<any[]>`
      SELECT e.type, COUNT(DISTINCT e.id) as count
      FROM entities e JOIN occurrences o ON o.entityId = e.id JOIN files f ON f.id = o.fileId
      WHERE f.sessionId = ${sessionId} GROUP BY e.type
    `,
    prisma.$queryRaw<any[]>`
      SELECT e.displayName as label, e.type, SUM(o.count) as count
      FROM entities e JOIN occurrences o ON o.entityId = e.id JOIN files f ON f.id = o.fileId
      WHERE f.sessionId = ${sessionId} GROUP BY e.id, e.displayName, e.type
      ORDER BY count DESC LIMIT 100
    `,
    prisma.$queryRaw<any[]>`
      SELECT e.displayName as label, e.type, SUM(o.tfidf) as tfidf
      FROM entities e JOIN occurrences o ON o.entityId = e.id JOIN files f ON f.id = o.fileId
      WHERE f.sessionId = ${sessionId} GROUP BY e.id, e.displayName, e.type
      ORDER BY tfidf DESC LIMIT 100
    `,
    prisma.$queryRaw<any[]>`
      SELECT e1.type as typeA, e2.type as typeB, COUNT(*) as count
      FROM entity_neighborhoods n JOIN entities e1 ON n.sourceEntityId = e1.id JOIN entities e2 ON n.targetEntityId = e2.id JOIN files f ON n.fileId = f.id
      WHERE f.sessionId = ${sessionId} AND e1.type <= e2.type GROUP BY typeA, typeB
      ORDER BY count DESC LIMIT 5
    `,
    prisma.$queryRaw<any[]>`
      SELECT o.entityId FROM occurrences o JOIN files f ON f.id = o.fileId
      WHERE f.sessionId = ${sessionId} GROUP BY o.entityId ORDER BY SUM(o.count) DESC LIMIT 250
    `,
  ]);

  const V = new Set<string>(topEntitiesForBridges.map((e) => e.entityId));
  let bridges: Array<{ label: string; type: string; score: number }> = [];

  if (V.size > 0) {
    const neighborhoods = await prisma.entityNeighborhood.findMany({
      where: {
        file: { sessionId },
        sourceEntityId: { in: Array.from(V) },
        targetEntityId: { in: Array.from(V) },
      },
      select: { sourceEntityId: true, targetEntityId: true },
    });

    const adj = buildAdj(V, neighborhoods);
    const centralityScores = brandes(Array.from(V), adj);

    const sortedBridges = Array.from(centralityScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30);

    const bridgeDetails = await prisma.entity.findMany({
      where: { id: { in: sortedBridges.map(([id]) => id) } },
      select: { id: true, displayName: true, type: true },
    });

    const detailsMap = new Map(bridgeDetails.map((e) => [e.id, e]));
    bridges = sortedBridges.map(([id, score]) => {
      const ent = detailsMap.get(id);
      return {
        label: ent?.displayName ?? 'Unknown',
        type: ent?.type ?? 'OTHER',
        score: Number(score.toFixed(4)),
      };
    });
  }

  return {
    general: {
      totalFiles: fileStats._count.id || 0,
      totalSize: Number(fileStats._sum.sizeBytes || 0),
      totalEntities,
      totalOccurrences: Number(totalOccurrences._sum.count || 0),
    },
    fileTypes: fileTypes.map((ft) => ({ mimeType: ft.mimeType, count: ft._count.id })),
    entityTypes: entityTypes.map((et) => ({ type: et.type, count: Number(et.count) })),
    topEntities: topEntities.map((te) => ({ label: te.label, type: te.type, count: Number(te.count) })),
    topTfidfEntities: topTfidfEntities.map((te) => ({ label: te.label, type: te.type, tfidf: Number(te.tfidf) })),
    cooccurrences: cooccurrencesRaw.map((co) => ({ typeA: co.typeA, typeB: co.typeB, count: Number(co.count) })),
    bridges,
  };
}
