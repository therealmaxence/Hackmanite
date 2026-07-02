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

export function buildAiReportDataFromGraph(graphData: { nodes: any[]; edges: any[]; emails?: any[] }): AiReportData {
  const nodes = graphData.nodes || [];
  const edges = graphData.edges || [];
  const emails = graphData.emails || [];

  // Find unique files
  const filesMap = new Map<string, { id: string; mimeType: string; sizeBytes: number }>();
  let totalOccurrences = 0;
  for (const node of nodes) {
    for (const occ of node.occurrences || []) {
      totalOccurrences += occ.count || 0;
      if (occ.fileId && !filesMap.has(occ.fileId)) {
        filesMap.set(occ.fileId, {
          id: occ.fileId,
          mimeType: occ.mimeType || 'application/octet-stream',
          sizeBytes: Number(occ.sizeBytes || 0),
        });
      }
    }
  }

  const uniqueFiles = Array.from(filesMap.values());
  const totalSize = uniqueFiles.reduce((sum, f) => sum + f.sizeBytes, 0);

  // Group file types
  const fileTypesMap = new Map<string, number>();
  for (const f of uniqueFiles) {
    fileTypesMap.set(f.mimeType, (fileTypesMap.get(f.mimeType) || 0) + 1);
  }
  const fileTypes = Array.from(fileTypesMap.entries()).map(([mimeType, count]) => ({ mimeType, count }));

  // Group entity types
  const entityTypesMap = new Map<string, number>();
  for (const n of nodes) {
    entityTypesMap.set(n.type, (entityTypesMap.get(n.type) || 0) + 1);
  }
  const entityTypes = Array.from(entityTypesMap.entries()).map(([type, count]) => ({ type, count }));

  // Top entities (by sum of count)
  const topEntities = nodes
    .map((n) => {
      const count = (n.occurrences || []).reduce((sum: number, o: any) => sum + (o.count || 0), 0);
      return { label: n.label || n.displayName || 'Unknown', type: n.type, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 100);

  // Top TF-IDF entities
  const topTfidfEntities = nodes
    .map((n) => {
      const tfidf = (n.occurrences || []).reduce((sum: number, o: any) => sum + (o.tfidf || 0), 0);
      return { label: n.label || n.displayName || 'Unknown', type: n.type, tfidf };
    })
    .sort((a, b) => b.tfidf - a.tfidf)
    .slice(0, 100);

  // Cooccurrences of types (typeA <= typeB)
  const cooccurrencesMap = new Map<string, number>();
  for (const edge of edges) {
    const srcNode = nodes.find((n) => n.id === edge.source);
    const tgtNode = nodes.find((n) => n.id === edge.target);
    if (srcNode && tgtNode) {
      const [typeA, typeB] = srcNode.type <= tgtNode.type ? [srcNode.type, tgtNode.type] : [tgtNode.type, srcNode.type];
      const key = `${typeA}:${typeB}`;
      cooccurrencesMap.set(key, (cooccurrencesMap.get(key) || 0) + 1);
    }
  }
  const cooccurrences = Array.from(cooccurrencesMap.entries())
    .map(([key, count]) => {
      const [typeA, typeB] = key.split(':');
      return { typeA, typeB, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Bridges (using brandes)
  // Limit to top 250 entities for Brandes to run fast
  const topNodesForBridges = nodes
    .map((n) => {
      const count = (n.occurrences || []).reduce((sum: number, o: any) => sum + (o.count || 0), 0);
      return { id: n.id, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 250);
  const V = new Set<string>(topNodesForBridges.map((n) => n.id));

  let bridges: Array<{ label: string; type: string; score: number }> = [];
  if (V.size > 0) {
    const neighborhoods = edges.filter((e) => V.has(e.source) && V.has(e.target));
    const adj = buildAdj(V, neighborhoods.map((e) => ({ sourceEntityId: e.source, targetEntityId: e.target })));
    const centralityScores = brandes(Array.from(V), adj);

    const sortedBridges = Array.from(centralityScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30);

    bridges = sortedBridges.map(([id, score]) => {
      const n = nodes.find((node) => node.id === id);
      return {
        label: n?.label || n?.displayName || 'Unknown',
        type: n?.type || 'OTHER',
        score: Number(score.toFixed(4)),
      };
    });
  }

  return {
    general: {
      totalFiles: uniqueFiles.length,
      totalSize: totalSize,
      totalEntities: nodes.length,
      totalOccurrences: totalOccurrences,
    },
    fileTypes,
    entityTypes,
    topEntities,
    topTfidfEntities,
    cooccurrences,
    bridges,
  };
}
