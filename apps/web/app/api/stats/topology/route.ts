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

    let topology = {
      density: 0,
      avgPathLength: 0,
      clusteringCoefficient: 0,
    };

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
        // Fallback characters co-occurrence
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

      const totalNodesCount = V.size;
      const totalEdgesCount = edgeKeys.size;

      const density = totalNodesCount > 1 
        ? (2 * totalEdgesCount) / (totalNodesCount * (totalNodesCount - 1)) 
        : 0;

      let totalClustering = 0;
      for (const nodeId of V) {
        const neighbors = adj.get(nodeId);
        if (!neighbors || neighbors.size < 2) {
          continue;
        }
        const k = neighbors.size;
        let actualTriangles = 0;
        const neighborArray = Array.from(neighbors);
        for (let i = 0; i < k; i++) {
          for (let j = i + 1; j < k; j++) {
            if (adj.get(neighborArray[i])?.has(neighborArray[j])) {
              actualTriangles++;
            }
          }
        }
        const possibleTriangles = (k * (k - 1)) / 2;
        totalClustering += actualTriangles / possibleTriangles;
      }
      const avgClusteringCoefficient = totalNodesCount > 0 
        ? totalClustering / totalNodesCount 
        : 0;

      let pathSum = 0;
      let pathCount = 0;
      const nodesList = Array.from(V);
      const sampleNodes = nodesList.length <= 500 
        ? nodesList 
        : nodesList.sort(() => 0.5 - Math.random()).slice(0, 500);

      for (const startNode of sampleNodes) {
        const dist = new Map<string, number>();
        const queue: string[] = [startNode];
        dist.set(startNode, 0);

        while (queue.length > 0) {
          const u = queue.shift()!;
          const d = dist.get(u)!;
          const neighbors = adj.get(u) || new Set<string>();

          for (const v of neighbors) {
            if (!dist.has(v)) {
              dist.set(v, d + 1);
              queue.push(v);
              pathSum += d + 1;
              pathCount++;
            }
          }
        }
      }
      const avgPathLength = pathCount > 0 ? pathSum / pathCount : 0;

      topology = {
        density: parseFloat(density.toFixed(4)),
        avgPathLength: parseFloat(avgPathLength.toFixed(2)),
        clusteringCoefficient: parseFloat(avgClusteringCoefficient.toFixed(4)),
      };
    }

    return NextResponse.json(topology);
  } catch (err: unknown) {
    console.error('Topology API Error:', err);
    return NextResponse.json(
      { error: 'Internal Server Error', code: ErrorCodes.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}
