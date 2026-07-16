import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/types/api';
import { cache } from '@/lib/cache';

export const runtime = 'nodejs';

function buildAdj(nodes: Set<string>, neighborhoods: { sourceEntityId: string; targetEntityId: string }[]) {
  const adj = new Map<string, Set<string>>();
  const seen = new Set<string>();
  for (const { sourceEntityId: s, targetEntityId: t } of neighborhoods) {
    if (s === t || !nodes.has(s) || !nodes.has(t)) continue;
    const key = s < t ? `${s}:${t}` : `${t}:${s}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (!adj.has(s)) adj.set(s, new Set()); if (!adj.has(t)) adj.set(t, new Set());
    adj.get(s)!.add(t); adj.get(t)!.add(s);
  }
  return { adj, edgeCount: seen.size };
}

export async function GET(req: NextRequest) {
  const sessionId = new URL(req.url).searchParams.get('sessionId');
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required', code: ErrorCodes.VALIDATION_ERROR }, { status: 400 });
  }

  try {
    const files = await prisma.file.findMany({ where: { sessionId }, select: { id: true } });
    const fileIds = files.map((f) => f.id);

    let topology = { density: 0, avgPathLength: 0, clusteringCoefficient: 0 };

    if (fileIds.length > 0) {
      const [occurrences, neighborhoods] = await Promise.all([
        prisma.occurrence.findMany({ where: { fileId: { in: fileIds } }, select: { entityId: true } }),
        prisma.entityNeighborhood.findMany({ where: { fileId: { in: fileIds } }, select: { sourceEntityId: true, targetEntityId: true } }),
      ]);

      const V = new Set<string>(occurrences.map((o) => o.entityId));
      let adj: Map<string, Set<string>>;
      let edgeCount: number;

      if (neighborhoods.length > 0) {
        ({ adj, edgeCount } = buildAdj(V, neighborhoods));
      } else if (occurrences.length > 0) {
        // Fallback: co-occurrence within window
        const occurrencesWithExcerpts = await prisma.occurrence.findMany({
          where: { fileId: { in: fileIds } },
          select: { entityId: true, fileId: true, excerpts: true },
        });
        const windowSizeVal = await cache.get(`session:window_size:${sessionId}`);
        const windowSize = windowSizeVal ? parseInt(windowSizeVal, 10) : 400;

        adj = new Map<string, Set<string>>();
        const seen = new Set<string>();
        const byFile = new Map<string, { entityId: string; offset: number }[]>();
        for (const occ of occurrencesWithExcerpts) {
          const offset = Array.isArray(occ.excerpts) && occ.excerpts[0] && typeof occ.excerpts[0] === 'object' && 'offset' in occ.excerpts[0]
            ? Number((occ.excerpts[0] as { offset?: unknown }).offset ?? 0) : 0;
          const bucket = byFile.get(occ.fileId) ?? [];
          bucket.push({ entityId: occ.entityId, offset });
          byFile.set(occ.fileId, bucket);
        }
        for (const list of byFile.values()) {
          list.sort((a, b) => a.offset - b.offset);
          for (let i = 0; i < list.length; i++) {
            for (let j = i + 1; j < list.length; j++) {
              if (list[j].offset - list[i].offset > windowSize) break;
              if (list[i].entityId === list[j].entityId) continue;
              const [s, t] = [list[i].entityId, list[j].entityId];
              const key = s < t ? `${s}:${t}` : `${t}:${s}`;
              if (seen.has(key)) continue;
              seen.add(key);
              if (!adj.has(s)) adj.set(s, new Set()); if (!adj.has(t)) adj.set(t, new Set());
              adj.get(s)!.add(t); adj.get(t)!.add(s);
            }
          }
        }
        edgeCount = seen.size;
      } else {
        return NextResponse.json(topology);
      }

      const n = V.size;
      const density = n > 1 ? (2 * edgeCount) / (n * (n - 1)) : 0;

      const nodesList = [...V];
      const sample500 = nodesList.length <= 500 ? nodesList : nodesList.sort(() => 0.5 - Math.random()).slice(0, 500);
      let totalClustering = 0;
      for (const nodeId of sample500) {
        const neighbors = adj.get(nodeId);
        if (!neighbors || neighbors.size < 2) continue;
        const nbArr = [...neighbors];
        let triangles = 0;
        for (let i = 0; i < nbArr.length; i++)
          for (let j = i + 1; j < nbArr.length; j++)
            if (adj.get(nbArr[i])?.has(nbArr[j])) triangles++;
        totalClustering += triangles / ((nbArr.length * (nbArr.length - 1)) / 2);
      }

      // BFS avg path length on index-based arrays for performance
      const nodeToIndex = new Map<string, number>([...V].map((id, i) => [id, i]));
      const adjIndexed = Array.from({ length: n }, () => [] as number[]);
      for (const [s, nbrs] of adj) {
        const si = nodeToIndex.get(s)!;
        for (const t of nbrs) { const ti = nodeToIndex.get(t); if (ti !== undefined) adjIndexed[si].push(ti); }
      }

      const sample100 = nodesList.length <= 100 ? nodesList : nodesList.sort(() => 0.5 - Math.random()).slice(0, 100);
      let pathSum = 0, pathCount = 0;
      for (const startNode of sample100) {
        const startIdx = nodeToIndex.get(startNode);
        if (startIdx === undefined) continue;
        const dist = new Int32Array(n).fill(-1);
        dist[startIdx] = 0;
        const queue = new Int32Array(n);
        let head = 0, tail = 1;
        queue[0] = startIdx;
        while (head < tail) {
          const u = queue[head++];
          for (const v of adjIndexed[u]) {
            if (dist[v] === -1) { dist[v] = dist[u] + 1; pathSum += dist[v]; pathCount++; queue[tail++] = v; }
          }
        }
      }

      topology = {
        density: parseFloat(density.toFixed(4)),
        avgPathLength: parseFloat((pathCount > 0 ? pathSum / pathCount : 0).toFixed(2)),
        clusteringCoefficient: parseFloat((sample500.length > 0 ? totalClustering / sample500.length : 0).toFixed(4)),
      };
    }

    return NextResponse.json(topology);
  } catch (err: unknown) {
    console.error('Topology API Error:', err);
    return NextResponse.json({ error: 'Internal Server Error', code: ErrorCodes.INTERNAL_ERROR }, { status: 500 });
  }
}
