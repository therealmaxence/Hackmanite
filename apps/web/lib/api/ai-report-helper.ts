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

function buildNodeIndex(nodes: any[]) {
  return new Map(nodes.map((node) => [node.id, node] as const));
}

function occurrenceCount(node: any) {
  return (node.occurrences || []).reduce((sum: number, occ: any) => sum + (occ.count || 0), 0);
}

function tfidfTotal(node: any) {
  return typeof node.tfidf === 'number'
    ? node.tfidf
    : (node.occurrences || []).reduce((sum: number, occ: any) => sum + (occ.tfidf || 0), 0);
}

function countEntries<T extends string>(values: T[], keyName: string) {
  const counts = new Map<T, number>();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return Array.from(counts.entries()).map(([key, count]) => ({ [keyName]: key, count }));
}

function computeBridgeEntities(nodes: any[], edges: any[], nodeById: Map<string, any>) {
  const topNodeIds = nodes
    .map((node) => ({ id: node.id, count: occurrenceCount(node) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 250)
    .map((node) => node.id);
  const V = new Set<string>(topNodeIds);
  if (!V.size) return [];

  const neighborhoods = edges.filter((edge) => V.has(edge.source) && V.has(edge.target));
  const centralityScores = brandes(topNodeIds, buildAdj(V, neighborhoods.map((edge) => ({ sourceEntityId: edge.source, targetEntityId: edge.target }))));
  return Array.from(centralityScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([id, score]) => {
      const node = nodeById.get(id);
      return { label: node?.label || node?.displayName || 'Unknown', type: node?.type || 'OTHER', score: Number(score.toFixed(4)) };
    });
}

export function buildAiReportDataFromGraph(graphData: { nodes: any[]; edges: any[]; emails?: any[] }): AiReportData {
  const nodes = graphData.nodes || [];
  const edges = graphData.edges || [];
  const nodeById = buildNodeIndex(nodes);
  const filesMap = new Map<string, { mimeType: string; sizeBytes: number }>();
  let totalOccurrences = 0;

  for (const node of nodes) {
    for (const occ of node.occurrences || []) {
      totalOccurrences += occ.count || 0;
      if (occ.fileId && !filesMap.has(occ.fileId)) {
        filesMap.set(occ.fileId, { mimeType: occ.mimeType || 'application/octet-stream', sizeBytes: Number(occ.sizeBytes || 0) });
      }
    }
  }

  const uniqueFiles = Array.from(filesMap.values());
  const cooccurrencesMap = new Map<string, number>();
  for (const edge of edges) {
    const srcNode = nodeById.get(edge.source);
    const tgtNode = nodeById.get(edge.target);
    if (!srcNode || !tgtNode) continue;
    const [typeA, typeB] = srcNode.type <= tgtNode.type ? [srcNode.type, tgtNode.type] : [tgtNode.type, srcNode.type];
    const key = `${typeA}:${typeB}`;
    cooccurrencesMap.set(key, (cooccurrencesMap.get(key) || 0) + 1);
  }

  return {
    general: {
      totalFiles: uniqueFiles.length,
      totalSize: uniqueFiles.reduce((sum, file) => sum + file.sizeBytes, 0),
      totalEntities: nodes.length,
      totalOccurrences,
    },
    fileTypes: countEntries(uniqueFiles.map((file) => file.mimeType), 'mimeType') as AiReportData['fileTypes'],
    entityTypes: countEntries(nodes.map((node) => node.type), 'type') as AiReportData['entityTypes'],
    topEntities: nodes
      .map((node) => ({ label: node.label || node.displayName || 'Unknown', type: node.type, count: occurrenceCount(node) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 100),
    topTfidfEntities: nodes
      .map((node) => ({ label: node.label || node.displayName || 'Unknown', type: node.type, tfidf: tfidfTotal(node) }))
      .sort((a, b) => b.tfidf - a.tfidf)
      .slice(0, 100),
    cooccurrences: Array.from(cooccurrencesMap.entries())
      .map(([key, count]) => {
        const [typeA, typeB] = key.split(':');
        return { typeA, typeB, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    bridges: computeBridgeEntities(nodes, edges, nodeById),
  };
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
