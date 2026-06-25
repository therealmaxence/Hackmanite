import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/types/api';
import { brandes, buildAdj } from '@/lib/brandes';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required', code: ErrorCodes.VALIDATION_ERROR }, { status: 400 });
  }

  try {
    const files = await prisma.file.findMany({ where: { sessionId, status: 'DONE' }, select: { id: true, originalCreatedAt: true } });
    const fileIds = files.map((f) => f.id);
    if (!fileIds.length) return NextResponse.json({ bridgeSignals: [], nicheSignals: [], emergingSignals: [] });

    const occurrences = await prisma.occurrence.findMany({
      where: { fileId: { in: fileIds } },
      select: { entityId: true, fileId: true, count: true, tfidf: true },
    });

    const entityStats = new Map<string, { totalCount: number; fileCount: number; maxTfidf: number }>();
    for (const occ of occurrences) {
      const cur = entityStats.get(occ.entityId) ?? { totalCount: 0, fileCount: 0, maxTfidf: 0 };
      cur.totalCount += occ.count;
      cur.fileCount += 1;
      cur.maxTfidf = Math.max(cur.maxTfidf, occ.tfidf);
      entityStats.set(occ.entityId, cur);
    }

    // --- Methodology A: Rare Bridges (Betweenness Centrality) ---
    const sortedEntityIds = [...entityStats.keys()]
      .sort((a, b) => (entityStats.get(b)!.totalCount) - (entityStats.get(a)!.totalCount))
      .slice(0, 500);
    const V = new Set<string>(sortedEntityIds);

    const neighborhoods = await prisma.entityNeighborhood.findMany({
      where: { fileId: { in: fileIds }, sourceEntityId: { in: sortedEntityIds }, targetEntityId: { in: sortedEntityIds } },
      select: { sourceEntityId: true, targetEntityId: true },
    });
    const adj = buildAdj(V, neighborhoods);
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

    const bridgeEntitiesDb = await prisma.entity.findMany({
      where: { id: { in: bridgeSignalsRaw.map((b) => b.entityId) } },
      select: { id: true, displayName: true, type: true },
    });
    const bridgeEntityMap = new Map(bridgeEntitiesDb.map((e) => [e.id, e]));

    const bridgeSignals = bridgeSignalsRaw.map(({ entityId, score }) => {
      const ent = bridgeEntityMap.get(entityId);
      const s = entityStats.get(entityId)!;
      return { id: entityId, label: ent?.displayName ?? 'Unknown', type: ent?.type ?? 'OTHER', totalCount: s.totalCount, fileCount: s.fileCount, score };
    });

    // --- Methodology B: Niche Topics (Low Doc Frequency, High TF-IDF) ---
    const sortedNiches = [...entityStats.entries()]
      .filter(([, s]) => s.fileCount <= 2)
      .sort((a, b) => b[1].maxTfidf - a[1].maxTfidf);

    const nicheEntitiesDb = await prisma.entity.findMany({
      where: { id: { in: sortedNiches.map(([id]) => id) } },
      select: { id: true, displayName: true, type: true },
    });
    const nicheEntityMap = new Map(nicheEntitiesDb.map((e) => [e.id, e]));

    const nicheSignals = sortedNiches.map(([entityId, s]) => {
      const ent = nicheEntityMap.get(entityId);
      return { id: entityId, label: ent?.displayName ?? 'Unknown', type: ent?.type ?? 'OTHER', totalCount: s.totalCount, fileCount: s.fileCount, score: s.maxTfidf };
    });

    // --- Methodology C: Spiking Signals (Sliding Time Window) ---
    const datedFiles = files
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
          new Set(datedFiles.filter((f) => { const t = new Date(f.originalCreatedAt!).getTime(); return t >= win.start && t <= win.end; }).map((f) => f.id))
        );

        const spikeMap = new Map<string, { maxScore: number; peakCount: number; fileCount: number }>();

        for (const winFileIds of winFileIdSets) {
          if (!winFileIds.size) continue;
          const winOccs = occurrences.filter((o) => winFileIds.has(o.fileId));
          const winStats = new Map<string, { count: number; tfidf: number; fileCount: number }>();
          for (const occ of winOccs) {
            const cur = winStats.get(occ.entityId) ?? { count: 0, tfidf: 0, fileCount: 0 };
            cur.count += occ.count; cur.tfidf += occ.tfidf; cur.fileCount += 1;
            winStats.set(occ.entityId, cur);
          }
          for (const [entityId, ws] of winStats) {
            const gs = entityStats.get(entityId);
            if (!gs || gs.totalCount > 25) continue;
            const ratio = ws.count / gs.totalCount;
            if (ratio >= 0.6) {
              const score = ws.tfidf * ratio;
              const ex = spikeMap.get(entityId);
              if (!ex || score > ex.maxScore) spikeMap.set(entityId, { maxScore: score, peakCount: ws.count, fileCount: ws.fileCount });
            }
          }
        }

        const sortedSpikes = [...spikeMap.entries()].sort((a, b) => b[1].maxScore - a[1].maxScore);
        const spikeEntitiesDb = await prisma.entity.findMany({
          where: { id: { in: sortedSpikes.map(([id]) => id) } },
          select: { id: true, displayName: true, type: true },
        });
        const spikeEntityMap = new Map(spikeEntitiesDb.map((e) => [e.id, e]));

        emergingSignals = sortedSpikes.map(([id, s]) => {
          const ent = spikeEntityMap.get(id);
          return { id, label: ent?.displayName ?? 'Unknown', type: ent?.type ?? 'OTHER', totalCount: s.peakCount, fileCount: s.fileCount, score: s.maxScore };
        });
      }
    }

    return NextResponse.json({ bridgeSignals, nicheSignals, emergingSignals });
  } catch (err: unknown) {
    console.error('Weak Signals API Error:', err);
    return NextResponse.json({ error: 'Internal Server Error', code: ErrorCodes.INTERNAL_ERROR }, { status: 500 });
  }
}
