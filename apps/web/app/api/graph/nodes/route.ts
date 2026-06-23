import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redis, RedisKeys, RedisTTL } from '@/lib/redis';
import { ENTITY_COLORS } from '@/types/entities';
import type { EntityType } from '@/types/entities';
import { ErrorCodes } from '@/types/api';
import { syncSessionToKuzu } from '@/lib/api/entity';

export const runtime = 'nodejs';

const NLP_URL = process.env.NLP_SERVICE_URL || 'http://localhost:8000';

const fetchNodes = async (fileIds: string[], limit: number, offset: number, types?: string | null) => {
  const res = await fetch(`${NLP_URL}/graph/nodes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_ids: fileIds, limit, offset, ...(types ? { types } : {}) }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Upstream graph service error ${res.status}`);
  return res.json();
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');
  const types = searchParams.get('types');
  const limit = Math.min(Number(searchParams.get('limit') || 50), 500);
  const offset = Number(searchParams.get('offset') || 0);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required', code: ErrorCodes.VALIDATION_ERROR }, { status: 400 });
  }

  try {
    const typeKey = types || 'all';
    const cacheKey = `${RedisKeys.sessionGraph(sessionId)}:t=${typeKey}:d=${from || 'any'}:${to || 'any'}:off=${offset}:lim=${limit}`;
    const cached = await redis.get(cacheKey);
    if (cached) return NextResponse.json(JSON.parse(cached));

    const fileFrom = from ? new Date(from) : null;
    const fileTo = to ? new Date(to) : null;
    const files = await prisma.file.findMany({
      where: {
        sessionId, status: 'DONE',
        ...(fileFrom || fileTo ? { originalCreatedAt: { ...(fileFrom ? { gte: fileFrom } : {}), ...(fileTo ? { lte: fileTo } : {}) } } : {}),
      },
      select: { id: true },
    });

    const fileIds = files.map((f) => f.id);
    if (!fileIds.length) return NextResponse.json({ nodes: [], total: 0, offset, has_more: false });

    let data = await fetchNodes(fileIds, limit, offset, types);

    // Self-healing: if KuzuDB empty but SQLite has occurrences, sync and retry
    if ((!data.nodes?.length) && fileIds.length > 0) {
      const occurrenceCount = await prisma.occurrence.count({ where: { fileId: { in: fileIds } } });
      if (occurrenceCount > 0) {
        try {
          await syncSessionToKuzu(sessionId);
          const refetch = await fetch(`${NLP_URL}/graph/nodes`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file_ids: fileIds, limit, offset, ...(types ? { types } : {}) }), cache: 'no-store',
          });
          if (refetch.ok) data = await refetch.json();
        } catch { /* sync failure non-fatal */ }
      }
    }

    const session = await prisma.session.findUnique({ where: { id: sessionId }, select: { hiddenNodeIds: true } });
    const hiddenNodeIds = new Set<string>(JSON.parse(session?.hiddenNodeIds || '[]'));

    const nodes = (data.nodes ?? [])
      .filter((n: any) => n.display_name?.trim() && n.type?.trim() && !hiddenNodeIds.has(n.id))
      .map((n: { id: string; display_name: string; type: string; total_count: number; file_count: number; tfidf?: number }) => ({
        id: n.id, label: n.display_name, type: n.type as EntityType,
        fileCount: n.file_count, totalOccurrences: n.total_count, tfidf: n.tfidf ?? 0,
        color: ENTITY_COLORS[n.type as EntityType] || '#6b7280',
      }));

    let hiddenCount = 0;
    if (hiddenNodeIds.size > 0) {
      const hidden = await prisma.occurrence.groupBy({
        by: ['entityId'],
        where: { fileId: { in: fileIds }, entityId: { in: [...hiddenNodeIds] } },
      });
      hiddenCount = hidden.length;
    }

    const response = { nodes, total: Math.max(0, (data.total ?? nodes.length) - hiddenCount), offset, has_more: data.has_more ?? false };
    await redis.setex(cacheKey, RedisTTL.graph, JSON.stringify(response));
    return NextResponse.json(response);
  } catch (err: unknown) {
    console.error('Graph Nodes API Error:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg, code: ErrorCodes.INTERNAL_ERROR }, { status: 500 });
  }
}
