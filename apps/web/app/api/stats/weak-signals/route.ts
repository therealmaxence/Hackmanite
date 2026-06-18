import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/types/api';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json(
      { error: 'sessionId required', code: ErrorCodes.VALIDATION_ERROR },
      { status: 400 }
    );
  }

  try {
    const files = await prisma.file.findMany({
      where: { sessionId, status: 'DONE' },
      select: { id: true, originalCreatedAt: true },
    });

    const fileIds = files.map(f => f.id);
    if (fileIds.length === 0) {
      return NextResponse.json({ bridgeSignals: [], nicheSignals: [], emergingSignals: [] });
    }

    // --- 1. Get occurrences and count distributions ---
    const occurrences = await prisma.occurrence.findMany({
      where: { fileId: { in: fileIds } },
      select: { entityId: true, fileId: true, count: true, tfidf: true },
    });

    const entityStats = new Map<string, { totalCount: number; fileCount: number; maxTfidf: number }>();
    for (const occ of occurrences) {
      const current = entityStats.get(occ.entityId) || { totalCount: 0, fileCount: 0, maxTfidf: 0 };
      current.totalCount += occ.count;
      current.fileCount += 1;
      current.maxTfidf = Math.max(current.maxTfidf, occ.tfidf);
      entityStats.set(occ.entityId, current);
    }

    const allEntityIds = Array.from(entityStats.keys());

    // --- 2. Methodology A: Rare Bridges (Betweenness Centrality & degree on SQLite) ---
    // Select top 500 entities (to keep Brandes performance-reasonable)
    const sortedEntityIds = [...allEntityIds].sort((a, b) => {
      return (entityStats.get(b)?.totalCount || 0) - (entityStats.get(a)?.totalCount || 0);
    }).slice(0, 500);

    const V = new Set<string>(sortedEntityIds);
    const adj = new Map<string, Set<string>>();
    const edgeKeys = new Set<string>();

    const neighborhoods = await prisma.entityNeighborhood.findMany({
      where: {
        fileId: { in: fileIds },
        sourceEntityId: { in: Array.from(V) },
        targetEntityId: { in: Array.from(V) },
      },
      select: { sourceEntityId: true, targetEntityId: true },
    });

    for (const edge of neighborhoods) {
      const s = edge.sourceEntityId;
      const t = edge.targetEntityId;
      if (s === t || !V.has(s) || !V.has(t)) continue;
      const key = s < t ? `${s}:${t}` : `${t}:${s}`;
      if (!edgeKeys.has(key)) {
        edgeKeys.add(key);
        if (!adj.has(s)) adj.set(s, new Set());
        if (!adj.has(t)) adj.set(t, new Set());
        adj.get(s)!.add(t);
        adj.get(t)!.add(s);
      }
    }

    // Brandes' betweenness centrality
    const centrality = new Map<string, number>();
    for (const v of V) centrality.set(v, 0);

    const nodesList = Array.from(V);
    for (const s of nodesList) {
      const S: string[] = [];
      const P = new Map<string, string[]>();
      const sigma = new Map<string, number>();
      const d = new Map<string, number>();

      for (const w of nodesList) {
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
          if (d.get(w)! < 0) {
            d.set(w, dv + 1);
            Q.push(w);
          }
          if (d.get(w)! === dv + 1) {
            sigma.set(w, sigma.get(w)! + sigma.get(v)!);
            P.get(w)!.push(v);
          }
        }
      }

      const delta = new Map<string, number>();
      for (const w of nodesList) delta.set(w, 0);

      while (S.length > 0) {
        const w = S.pop()!;
        const coeff = (1 + delta.get(w)!) / sigma.get(w)!;
        for (const v of P.get(w)!) {
          delta.set(v, delta.get(v)! + sigma.get(v)! * coeff);
        }
        if (w !== s) {
          centrality.set(w, centrality.get(w)! + delta.get(w)!);
        }
      }
    }

    const bridgeSignalsRaw: any[] = [];
    for (const [entityId, stats] of entityStats.entries()) {
      // Focus on rare entities (totalCount <= 10)
      if (stats.totalCount <= 10) {
        const rawCentrality = (centrality.get(entityId) || 0) / 2;
        const degree = adj.get(entityId)?.size || 0;
        // Score: prioritizes bridging centrality, falls back to degree connectivity, scaled down by count penalty
        const score = (rawCentrality > 0 ? rawCentrality : degree * 0.1) / (stats.totalCount + 1);
        
        if (score > 0) {
          bridgeSignalsRaw.push({ entityId, score });
        }
      }
    }

    const sortedBridges = bridgeSignalsRaw.sort((a, b) => b.score - a.score).slice(0, 10);
    const bridgeEntities = await prisma.entity.findMany({
      where: { id: { in: sortedBridges.map(b => b.entityId) } },
      select: { id: true, displayName: true, type: true },
    });

    const bridgeSignals = sortedBridges.map(sb => {
      const ent = bridgeEntities.find(e => e.id === sb.entityId);
      const stats = entityStats.get(sb.entityId);
      return {
        id: sb.entityId,
        label: ent?.displayName || 'Unknown',
        type: ent?.type || 'OTHER',
        totalCount: stats?.totalCount || 0,
        fileCount: stats?.fileCount || 0,
        score: sb.score,
      };
    });

    // --- 3. Methodology B: Niche Topics (Low Document Frequency, High TF-IDF) ---
    const nicheSignalsRaw: any[] = [];
    for (const [entityId, stats] of entityStats.entries()) {
      if (stats.fileCount <= 2) {
        nicheSignalsRaw.push({ entityId, ...stats });
      }
    }

    const sortedNiches = nicheSignalsRaw.sort((a, b) => b.maxTfidf - a.maxTfidf).slice(0, 10);
    const nicheEntities = await prisma.entity.findMany({
      where: { id: { in: sortedNiches.map(n => n.entityId) } },
      select: { id: true, displayName: true, type: true },
    });

    const nicheSignals = sortedNiches.map(sn => {
      const ent = nicheEntities.find(e => e.id === sn.entityId);
      return {
        id: sn.entityId,
        label: ent?.displayName || 'Unknown',
        type: ent?.type || 'OTHER',
        totalCount: sn.totalCount,
        fileCount: sn.fileCount,
        score: sn.maxTfidf,
      };
    });

    // --- 4. Methodology C: Spiking Signals (Sliding Time Window) ---
    const datedFiles = files
      .filter(f => f.originalCreatedAt !== null)
      .sort((a, b) => new Date(a.originalCreatedAt!).getTime() - new Date(b.originalCreatedAt!).getTime());

    let emergingSignals: any[] = [];
    if (datedFiles.length >= 2) {
      const minTime = new Date(datedFiles[0].originalCreatedAt!).getTime();
      const maxTime = new Date(datedFiles[datedFiles.length - 1].originalCreatedAt!).getTime();
      const timespan = maxTime - minTime;

      if (timespan > 0) {
        const windowWidth = timespan * 0.20;
        const stepSize = timespan * 0.10;

        const windows: Array<{ start: number; end: number }> = [];
        for (let start = minTime; start <= maxTime - windowWidth + 1; start += stepSize) {
          windows.push({ start, end: start + windowWidth });
        }
        if (windows.length === 0 || windows[windows.length - 1].end < maxTime) {
          windows.push({ start: maxTime - windowWidth, end: maxTime });
        }

        const spikeSignalsRawMap = new Map<string, { maxScore: number; peakCount: number; fileCount: number }>();

        for (const win of windows) {
          const filesInWin = datedFiles.filter(f => {
            const t = new Date(f.originalCreatedAt!).getTime();
            return t >= win.start && t <= win.end;
          });
          const winFileIds = filesInWin.map(f => f.id);
          if (winFileIds.length === 0) continue;

          const winOccurrences = occurrences.filter(o => winFileIds.includes(o.fileId));
          const winStats = new Map<string, { count: number; tfidf: number; fileCount: number }>();
          for (const occ of winOccurrences) {
            const curr = winStats.get(occ.entityId) || { count: 0, tfidf: 0, fileCount: 0 };
            curr.count += occ.count;
            curr.tfidf += occ.tfidf;
            curr.fileCount += 1;
            winStats.set(occ.entityId, curr);
          }

          for (const [entityId, stats] of winStats.entries()) {
            const globalStats = entityStats.get(entityId);
            if (!globalStats) continue;

            const ratio = stats.count / globalStats.totalCount;

            // Concentration: at least 60% of occurrences fall inside this 20% time window
            if (ratio >= 0.6) {
              // Priority for globally rare/medium entities
              if (globalStats.totalCount <= 25) {
                const score = stats.tfidf * ratio;
                const existing = spikeSignalsRawMap.get(entityId);
                if (!existing || score > existing.maxScore) {
                  spikeSignalsRawMap.set(entityId, {
                    maxScore: score,
                    peakCount: stats.count,
                    fileCount: stats.fileCount,
                  });
                }
              }
            }
          }
        }

        const sortedSpikes = Array.from(spikeSignalsRawMap.entries())
          .sort((a, b) => b[1].maxScore - a[1].maxScore)
          .slice(0, 10);

        const spikeEntities = await prisma.entity.findMany({
          where: { id: { in: sortedSpikes.map(([id]) => id) } },
          select: { id: true, displayName: true, type: true },
        });

        emergingSignals = sortedSpikes.map(([id, stats]) => {
          const ent = spikeEntities.find(e => e.id === id);
          return {
            id,
            label: ent?.displayName || 'Unknown',
            type: ent?.type || 'OTHER',
            totalCount: stats.peakCount,
            fileCount: stats.fileCount,
            score: stats.maxScore,
          };
        });
      }
    }

    return NextResponse.json({ bridgeSignals, nicheSignals, emergingSignals });
  } catch (err: unknown) {
    console.error('Weak Signals API Error:', err);
    return NextResponse.json(
      { error: 'Internal Server Error', code: ErrorCodes.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}
