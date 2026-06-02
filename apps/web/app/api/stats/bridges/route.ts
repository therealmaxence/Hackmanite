import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/types/api';
import { redis } from '@/lib/redis';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const querySessionId = searchParams.get('sessionId');

  const sessionId = querySessionId;
  if (!sessionId) {
    return NextResponse.json(
      { error: 'sessionId required', code: ErrorCodes.VALIDATION_ERROR },
      { status: 400 }
    );
  }

  try {
    const files = await prisma.file.findMany({
      where: { sessionId },
      select: { id: true },
    });

    const fileIds = files.map(f => f.id);

    let bridgeEntities: any[] = [];

    if (fileIds.length > 0) {
      const occurrences = await prisma.occurrence.findMany({
        where: { fileId: { in: fileIds } },
        select: { entityId: true },
      });

      const neighborhoods = await prisma.entityNeighborhood.findMany({
        where: { fileId: { in: fileIds } },
        select: { sourceEntityId: true, targetEntityId: true },
      });

      const V = new Set<string>();
      const edgeKeys = new Set<string>();
      const adj = new Map<string, Set<string>>();

      for (const occ of occurrences) {
        V.add(occ.entityId);
      }

      if (neighborhoods.length > 0) {
        for (const edge of neighborhoods) {
          const s = edge.sourceEntityId;
          const t = edge.targetEntityId;
          if (!V.has(s) || !V.has(t)) continue;
          if (s === t) continue;

          const first = s < t ? s : t;
          const second = s < t ? t : s;
          const edgeKey = `${first}:${second}`;

          if (!edgeKeys.has(edgeKey)) {
            edgeKeys.add(edgeKey);
            if (!adj.has(s)) adj.set(s, new Set());
            if (!adj.has(t)) adj.set(t, new Set());
            adj.get(s)!.add(t);
            adj.get(t)!.add(s);
          }
        }
      } else if (occurrences.length > 0) {
        // Fallback co-occurrence calculation
        const occurrencesWithExcerpts = await prisma.occurrence.findMany({
          where: { fileId: { in: fileIds } },
          select: { entityId: true, fileId: true, excerpts: true },
        });

        const windowSizeVal = await redis.get(`session:window_size:${sessionId}`);
        const windowSize = windowSizeVal ? parseInt(windowSizeVal, 10) : 400;

        const occurrencesByFile = new Map<string, { entityId: string; offset: number }[]>();
        for (const occurrence of occurrencesWithExcerpts) {
          const offset = Array.isArray(occurrence.excerpts) && occurrence.excerpts.length > 0 && occurrence.excerpts[0] && typeof occurrence.excerpts[0] === 'object' && 'offset' in occurrence.excerpts[0]
            ? Number((occurrence.excerpts[0] as { offset?: unknown }).offset ?? 0)
            : 0;

          const bucket = occurrencesByFile.get(occurrence.fileId) ?? [];
          bucket.push({ entityId: occurrence.entityId, offset });
          occurrencesByFile.set(occurrence.fileId, bucket);
        }

        for (const fileOccurrences of Array.from(occurrencesByFile.values())) {
          fileOccurrences.sort((a, b) => a.offset - b.offset);

          for (let i = 0; i < fileOccurrences.length; i += 1) {
            const source = fileOccurrences[i];

            for (let j = i + 1; j < fileOccurrences.length; j += 1) {
              const target = fileOccurrences[j];
              const distance = target.offset - source.offset;

              if (distance > windowSize) {
                break;
              }

              if (source.entityId === target.entityId) {
                continue;
              }

              const s = source.entityId;
              const t = target.entityId;
              const first = s < t ? s : t;
              const second = s < t ? t : s;
              const edgeKey = `${first}:${second}`;

              if (!edgeKeys.has(edgeKey)) {
                edgeKeys.add(edgeKey);
                if (!adj.has(s)) adj.set(s, new Set());
                if (!adj.has(t)) adj.set(t, new Set());
                adj.get(s)!.add(t);
                adj.get(t)!.add(s);
              }
            }
          }
        }
      }

      // Betweenness Centrality (Brandes' Algorithm)
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

      for (const v of V) {
        centralityScores.set(v, centralityScores.get(v)! / 2);
      }

      const sortedBridges = Array.from(centralityScores.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      const bridgeEntitiesDetails = await prisma.entity.findMany({
        where: { id: { in: sortedBridges.map(([id]) => id) } },
        select: { id: true, displayName: true, type: true },
      });

      const detailsMap = new Map(bridgeEntitiesDetails.map(e => [e.id, e]));
      bridgeEntities = sortedBridges.map(([id, score]) => {
        const ent = detailsMap.get(id);
        return {
          id,
          label: ent?.displayName || 'Unknown',
          type: ent?.type || 'OTHER',
          score: parseFloat(score.toFixed(4)),
        };
      });
    }

    return NextResponse.json({ bridgeEntities });
  } catch (err: unknown) {
    console.error('Bridges API Error:', err);
    return NextResponse.json(
      { error: 'Internal Server Error', code: ErrorCodes.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}
