import { prisma } from '@/lib/prisma';

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
      FROM entities e
      JOIN occurrences o ON o.entityId = e.id
      JOIN files f ON f.id = o.fileId
      WHERE f.sessionId = ${sessionId}
      GROUP BY e.type
    `,
    prisma.$queryRaw<any[]>`
      SELECT e.displayName as label, e.type, SUM(o.count) as count
      FROM entities e
      JOIN occurrences o ON o.entityId = e.id
      JOIN files f ON f.id = o.fileId
      WHERE f.sessionId = ${sessionId}
      GROUP BY e.id, e.displayName, e.type
      ORDER BY count DESC
      LIMIT 50
    `,
    prisma.$queryRaw<any[]>`
      SELECT e.displayName as label, e.type, SUM(o.tfidf) as tfidf
      FROM entities e
      JOIN occurrences o ON o.entityId = e.id
      JOIN files f ON f.id = o.fileId
      WHERE f.sessionId = ${sessionId}
      GROUP BY e.id, e.displayName, e.type
      ORDER BY tfidf DESC
      LIMIT 50
    `,
    prisma.$queryRaw<any[]>`
      SELECT e1.type as typeA, e2.type as typeB, COUNT(*) as count
      FROM entity_neighborhoods n
      JOIN entities e1 ON n.sourceEntityId = e1.id
      JOIN entities e2 ON n.targetEntityId = e2.id
      JOIN files f ON n.fileId = f.id
      WHERE f.sessionId = ${sessionId} AND e1.type <= e2.type
      GROUP BY typeA, typeB
      ORDER BY count DESC
      LIMIT 5
    `,
    prisma.$queryRaw<any[]>`
      SELECT o.entityId
      FROM occurrences o
      JOIN files f ON f.id = o.fileId
      WHERE f.sessionId = ${sessionId}
      GROUP BY o.entityId
      ORDER BY SUM(o.count) DESC
      LIMIT 100
    `,
  ]);

  const V = new Set<string>(topEntitiesForBridges.map((e) => e.entityId));
  const adj = new Map<string, Set<string>>();
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

    for (const edge of neighborhoods) {
      const s = edge.sourceEntityId;
      const t = edge.targetEntityId;
      if (s === t) continue;
      if (!adj.has(s)) adj.set(s, new Set());
      if (!adj.has(t)) adj.set(t, new Set());
      adj.get(s)!.add(t);
      adj.get(t)!.add(s);
    }

    const centralityScores = new Map<string, number>();
    for (const v of V) centralityScores.set(v, 0);

    const allNodes = Array.from(V);
    for (const s of allNodes) {
      const S: string[] = [];
      const P = new Map<string, string[]>();
      const sigma = new Map<string, number>();
      const d = new Map<string, number>();

      for (const w of allNodes) {
        P.set(w, []);
        sigma.set(w, 0);
        d.set(w, -1);
      }

      sigma.set(s, 1);
      d.set(s, 0);

      const Q: string[] = [s];
      while (Q.length > 0) {
        const v = Q.shift()!;
        S.push(v);
        const dv = d.get(v)!;
        const neighbors = adj.get(v) || new Set<string>();
        for (const w of neighbors) {
          const dw = d.get(w)!;
          if (dw < 0) {
            d.set(w, dv + 1);
            Q.push(w);
          }
          if (d.get(w) === dv + 1) {
            sigma.set(w, sigma.get(w)! + sigma.get(v)!);
            P.get(w)!.push(v);
          }
        }
      }

      const delta = new Map<string, number>();
      for (const w of allNodes) delta.set(w, 0);

      while (S.length > 0) {
        const w = S.pop()!;
        const coeff = (1 + delta.get(w)!) / sigma.get(w)!;
        for (const v of P.get(w)!) {
          delta.set(v, delta.get(v)! + sigma.get(v)! * coeff);
        }
        if (w !== s) {
          centralityScores.set(w, centralityScores.get(w)! + delta.get(w)!);
        }
      }
    }

    const sortedBridges = Array.from(centralityScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const bridgeDetails = await prisma.entity.findMany({
      where: { id: { in: sortedBridges.map(([id]) => id) } },
      select: { id: true, displayName: true, type: true },
    });

    const detailsMap = new Map(bridgeDetails.map((e) => [e.id, e]));
    bridges = sortedBridges.map(([id, score]) => {
      const ent = detailsMap.get(id);
      return {
        label: ent?.displayName || 'Unknown',
        type: ent?.type || 'OTHER',
        score: parseFloat(score.toFixed(4)),
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
    fileTypes: fileTypes.map((ft) => ({
      mimeType: ft.mimeType,
      count: ft._count.id,
    })),
    entityTypes: entityTypes.map((et) => ({
      type: et.type,
      count: Number(et.count),
    })),
    topEntities: topEntities.map((te) => ({
      label: te.label,
      type: te.type,
      count: Number(te.count),
    })),
    topTfidfEntities: topTfidfEntities.map((te) => ({
      label: te.label,
      type: te.type,
      tfidf: Number(te.tfidf),
    })),
    cooccurrences: cooccurrencesRaw.map((co) => ({
      typeA: co.typeA,
      typeB: co.typeB,
      count: Number(co.count),
    })),
    bridges,
  };
}
