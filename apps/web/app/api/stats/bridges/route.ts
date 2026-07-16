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
    if (!adj.has(s)) adj.set(s, new Set());
    if (!adj.has(t)) adj.set(t, new Set());
    adj.get(s)!.add(t);
    adj.get(t)!.add(s);
  }
  return adj;
}

function buildAdjFromOccurrences(
  V: Set<string>,
  occurrencesWithExcerpts: { entityId: string; fileId: string; excerpts: any }[],
  windowSize: number
) {
  const adj = new Map<string, Set<string>>();
  const seen = new Set<string>();
  const byFile = new Map<string, { entityId: string; offset: number }[]>();
  for (const occ of occurrencesWithExcerpts) {
    const offset = Array.isArray(occ.excerpts) && occ.excerpts.length > 0 && occ.excerpts[0] && typeof occ.excerpts[0] === 'object' && 'offset' in occ.excerpts[0]
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
  return adj;
}

function brandes(nodes: string[], adj: Map<string, Set<string>>) {
  const centrality = new Map<string, number>(nodes.map((v) => [v, 0]));
  for (const s of nodes) {
    const S: string[] = [];
    const P = new Map<string, string[]>(nodes.map((w) => [w, []]));
    const sigma = new Map<string, number>(nodes.map((w) => [w, 0]));
    const d = new Map<string, number>(nodes.map((w) => [w, -1]));
    sigma.set(s, 1); d.set(s, 0);
    const Q: string[] = [s];
    while (Q.length) {
      const v = Q.shift()!; S.push(v); const dv = d.get(v)!;
      for (const w of (adj.get(v) ?? [])) {
        if (d.get(w)! < 0) { d.set(w, dv + 1); Q.push(w); }
        if (d.get(w)! === dv + 1) { sigma.set(w, sigma.get(w)! + sigma.get(v)!); P.get(w)!.push(v); }
      }
    }
    const delta = new Map<string, number>(nodes.map((w) => [w, 0]));
    while (S.length) {
      const w = S.pop()!;
      const coeff = (1 + delta.get(w)!) / sigma.get(w)!;
      for (const v of P.get(w)!) delta.set(v, delta.get(v)! + sigma.get(v)! * coeff);
      if (w !== s) centrality.set(w, centrality.get(w)! + delta.get(w)!);
    }
  }
  for (const v of nodes) centrality.set(v, centrality.get(v)! / 2);
  return centrality;
}

export async function GET(req: NextRequest) {
  const sessionId = new URL(req.url).searchParams.get('sessionId');
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required', code: ErrorCodes.VALIDATION_ERROR }, { status: 400 });
  }

  try {
    const files = await prisma.file.findMany({ where: { sessionId }, select: { id: true } });
    const fileIds = files.map((f) => f.id);
    let bridgeEntities: any[] = [];

    if (fileIds.length > 0) {
      const topEntitiesRaw = await prisma.$queryRaw<any[]>`
        SELECT o.entityId FROM occurrences o JOIN files f ON f.id = o.fileId
        WHERE f.sessionId = ${sessionId} GROUP BY o.entityId ORDER BY SUM(o.count) DESC LIMIT 250
      `;
      const allNodes = topEntitiesRaw.map((e) => e.entityId);
      const V = new Set<string>(allNodes);

      const neighborhoods = await prisma.entityNeighborhood.findMany({
        where: { fileId: { in: fileIds }, sourceEntityId: { in: allNodes }, targetEntityId: { in: allNodes } },
        select: { sourceEntityId: true, targetEntityId: true },
      });

      let adj: Map<string, Set<string>>;
      if (neighborhoods.length > 0) {
        adj = buildAdj(V, neighborhoods);
      } else {
        const occurrencesWithExcerpts = await prisma.occurrence.findMany({
          where: { fileId: { in: fileIds }, entityId: { in: allNodes } },
          select: { entityId: true, fileId: true, excerpts: true },
        });
        const windowSizeVal = await cache.get(`session:window_size:${sessionId}`);
        adj = buildAdjFromOccurrences(V, occurrencesWithExcerpts, windowSizeVal ? parseInt(windowSizeVal, 10) : 400);
      }

      const centralityScores = brandes(allNodes, adj);

      const sortedBridges = [...centralityScores.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
      const bridgeEntitiesDetails = await prisma.entity.findMany({
        where: { id: { in: sortedBridges.map(([id]) => id) } },
        select: { id: true, displayName: true, type: true },
      });
      const detailsMap = new Map(bridgeEntitiesDetails.map((e) => [e.id, e]));

      bridgeEntities = sortedBridges.map(([id, score]) => {
        const ent = detailsMap.get(id);
        return { id, label: ent?.displayName ?? 'Unknown', type: ent?.type ?? 'OTHER', score: parseFloat(score.toFixed(4)) };
      });
    }

    return NextResponse.json({ bridgeEntities });
  } catch (err: unknown) {
    console.error('Bridges API Error:', err);
    return NextResponse.json({ error: 'Internal Server Error', code: ErrorCodes.INTERNAL_ERROR }, { status: 500 });
  }
}
