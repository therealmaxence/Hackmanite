import { brandes, buildAdj } from '@/lib/brandes';

export interface WeakSignalsResult {
  bridgeSignals: any[];
  nicheSignals: any[];
  emergingSignals: any[];
}

export function computeWeakSignals(graphData: { nodes: any[]; edges: any[] }): WeakSignalsResult {
  const { nodes, edges } = graphData;

  if (!nodes || nodes.length === 0) {
    return { bridgeSignals: [], nicheSignals: [], emergingSignals: [] };
  }

  // 1. Compute entityStats from node occurrences
  const entityStats = new Map<string, { totalCount: number; fileCount: number; maxTfidf: number }>();
  const entityMap = new Map<string, any>();

  for (const node of nodes) {
    entityMap.set(node.id, node);
    let totalCount = 0;
    let maxTfidf = 0;
    const fileCount = node.occurrences?.length || 0;

    for (const occ of node.occurrences || []) {
      totalCount += occ.count || 0;
      maxTfidf = Math.max(maxTfidf, occ.tfidf || 0);
    }
    entityStats.set(node.id, { totalCount, fileCount, maxTfidf });
  }

  // ─── Methodology A: Rare Bridges ───────────────────────────────────────────
  const sortedEntityIds = [...entityStats.keys()]
    .sort((a, b) => (entityStats.get(b)!.totalCount) - (entityStats.get(a)!.totalCount))
    .slice(0, 500);
  const V = new Set<string>(sortedEntityIds);

  const neighborhoods = edges.filter((e) => V.has(e.source) && V.has(e.target));
  const adj = buildAdj(V, neighborhoods.map((e) => ({ sourceEntityId: e.source, targetEntityId: e.target })));
  const centrality = brandes(sortedEntityIds, adj);

  const bridgeSignalsRaw = [...entityStats.entries()]
    .filter(([, s]) => s.totalCount <= 10)
    .map(([entityId, s]) => {
      const rawC = (centrality.get(entityId) ?? 0) / 2;
      const degree = adj.get(entityId)?.size ?? 0;
      return { entityId, score: (rawC > 0 ? rawC : degree * 0.1) / (s.totalCount + 1) };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const bridgeSignals = bridgeSignalsRaw.map(({ entityId, score }) => {
    const ent = entityMap.get(entityId);
    const s = entityStats.get(entityId)!;
    return {
      id: entityId,
      label: ent?.label ?? ent?.displayName ?? 'Unknown',
      type: ent?.type ?? 'OTHER',
      totalCount: s.totalCount,
      fileCount: s.fileCount,
      score,
    };
  });

  // ─── Methodology B: Niche Topics ───────────────────────────────────────────
  const sortedNiches = [...entityStats.entries()]
    .filter(([, s]) => s.fileCount <= 2)
    .sort((a, b) => b[1].maxTfidf - a[1].maxTfidf);

  const nicheSignals = sortedNiches.map(([entityId, s]) => {
    const ent = entityMap.get(entityId);
    return {
      id: entityId,
      label: ent?.label ?? ent?.displayName ?? 'Unknown',
      type: ent?.type ?? 'OTHER',
      totalCount: s.totalCount,
      fileCount: s.fileCount,
      score: s.maxTfidf,
    };
  });

  // ─── Methodology C: Spiking Signals (Sliding Time Window) ───────────────────
  const filesMap = new Map<string, { id: string; originalCreatedAt: string | null }>();
  for (const node of nodes) {
    for (const occ of node.occurrences || []) {
      if (occ.fileId && !filesMap.has(occ.fileId)) {
        filesMap.set(occ.fileId, { id: occ.fileId, originalCreatedAt: occ.originalCreatedAt });
      }
    }
  }

  const datedFiles = Array.from(filesMap.values())
    .filter((f) => f.originalCreatedAt)
    .sort((a, b) => new Date(a.originalCreatedAt!).getTime() - new Date(b.originalCreatedAt!).getTime());

  let emergingSignals: any[] = [];
  if (datedFiles.length >= 2) {
    const minTime = new Date(datedFiles[0].originalCreatedAt!).getTime();
    const maxTime = new Date(datedFiles[datedFiles.length - 1].originalCreatedAt!).getTime();
    const timespan = maxTime - minTime;

    if (timespan > 0) {
      const windowWidth = timespan * 0.20;
      const stepSize = timespan * 0.10;
      const windows: { start: number; end: number }[] = [];
      for (let start = minTime; start <= maxTime - windowWidth + 1; start += stepSize) {
        windows.push({ start, end: start + windowWidth });
      }
      if (!windows.length || windows[windows.length - 1].end < maxTime) {
        windows.push({ start: maxTime - windowWidth, end: maxTime });
      }

      const winFileIdSets = windows.map((win) =>
        new Set(
          datedFiles
            .filter((f) => {
              const t = new Date(f.originalCreatedAt!).getTime();
              return t >= win.start && t <= win.end;
            })
            .map((f) => f.id)
        )
      );

      const spikeMap = new Map<string, { maxScore: number; peakCount: number; fileCount: number }>();

      // Pre-build occurrences list for sliding window
      const occurrencesList: Array<{ entityId: string; fileId: string; count: number; tfidf: number }> = [];
      for (const node of nodes) {
        for (const occ of node.occurrences || []) {
          occurrencesList.push({
            entityId: node.id,
            fileId: occ.fileId,
            count: occ.count,
            tfidf: occ.tfidf || 0,
          });
        }
      }

      for (const winFileIds of winFileIdSets) {
        if (!winFileIds.size) continue;
        const winOccs = occurrencesList.filter((o) => winFileIds.has(o.fileId));
        const winStats = new Map<string, { count: number; tfidf: number; fileCount: number }>();

        for (const occ of winOccs) {
          const cur = winStats.get(occ.entityId) ?? { count: 0, tfidf: 0, fileCount: 0 };
          cur.count += occ.count;
          cur.tfidf += occ.tfidf;
          cur.fileCount += 1;
          winStats.set(occ.entityId, cur);
        }

        for (const [entityId, ws] of winStats) {
          const gs = entityStats.get(entityId);
          if (!gs || gs.totalCount > 25) continue;
          const ratio = ws.count / gs.totalCount;
          if (ratio >= 0.6) {
            const score = ws.tfidf * ratio;
            const ex = spikeMap.get(entityId);
            if (!ex || score > ex.maxScore) {
              spikeMap.set(entityId, { maxScore: score, peakCount: ws.count, fileCount: ws.fileCount });
            }
          }
        }
      }

      const sortedSpikes = [...spikeMap.entries()].sort((a, b) => b[1].maxScore - a[1].maxScore);
      emergingSignals = sortedSpikes.map(([id, s]) => {
        const ent = entityMap.get(id);
        return {
          id,
          label: ent?.label ?? ent?.displayName ?? 'Unknown',
          type: ent?.type ?? 'OTHER',
          totalCount: s.peakCount,
          fileCount: s.fileCount,
          score: s.maxScore,
        };
      });
    }
  }

  return { bridgeSignals, nicheSignals, emergingSignals };
}
