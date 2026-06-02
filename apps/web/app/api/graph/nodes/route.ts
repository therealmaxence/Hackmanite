import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redis, RedisKeys, RedisTTL } from '@/lib/redis';
import { ENTITY_COLORS } from '@/types/entities';
import type { EntityType } from '@/types/entities';
import { ErrorCodes } from '@/types/api';
import { syncSessionToKuzu } from '@/lib/api/entity';

export const runtime = 'nodejs';

const NLP_URL = process.env.NLP_SERVICE_URL || 'http://localhost:8000';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');
  const types = searchParams.get('types');
  const limit = Math.min(Number(searchParams.get('limit') || 50), 500);
  const offset = Number(searchParams.get('offset') || 0);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!sessionId) {
    return NextResponse.json(
      { error: 'sessionId required', code: ErrorCodes.VALIDATION_ERROR },
      { status: 400 }
    );
  }

  try {
    // Cache key includes pagination so different pages don't collide
    const typeKey = types || 'all';
    const cacheKey = `${RedisKeys.sessionGraph(sessionId)}:t=${typeKey}:d=${from || 'any'}:${to || 'any'}:off=${offset}:lim=${limit}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return NextResponse.json(JSON.parse(cached));
    }

    // 1. Resolve file IDs for this session from SQLite (sessions stay in Prisma)
    const fileFrom = from ? new Date(from) : null;
    const fileTo = to ? new Date(to) : null;

    const files = await prisma.file.findMany({
      where: {
        sessionId,
        status: 'DONE', // only count fully-processed files
        ...(fileFrom || fileTo
          ? {
              originalCreatedAt: {
                ...(fileFrom ? { gte: fileFrom } : {}),
                ...(fileTo ? { lte: fileTo } : {}),
              },
            }
          : {}),
      },
      select: { id: true },
    });

    const fileIds = files.map((f) => f.id);
    if (fileIds.length === 0) {
      return NextResponse.json({ nodes: [], total: 0, offset, has_more: false });
    }

    // 2. Delegate the heavy aggregation to KuzuDB via the Python service
    const params = new URLSearchParams({
      file_ids: fileIds.join(','),
      limit: String(limit),
      offset: String(offset),
      ...(types ? { types } : {}),
    });

    let upstream = await fetch(`${NLP_URL}/graph/nodes?${params}`, { cache: 'no-store' });
    if (!upstream.ok) {
      throw new Error(`Upstream graph service error ${upstream.status}`);
    }

    let data = await upstream.json();

    // Self-healing synchronization: if KuzuDB returns no nodes but we have occurrences in SQLite
    if ((!data.nodes || data.nodes.length === 0) && fileIds.length > 0) {
      const occurrenceCount = await prisma.occurrence.count({
        where: { fileId: { in: fileIds } },
      });
      if (occurrenceCount > 0) {
        console.log(`[Self-healing] KuzuDB nodes empty for session ${sessionId}. Syncing from SQLite...`);
        try {
          await syncSessionToKuzu(sessionId);
          // Re-fetch nodes after successful sync
          upstream = await fetch(`${NLP_URL}/graph/nodes?${params}`, { cache: 'no-store' });
          if (upstream.ok) {
            data = await upstream.json();
            console.log(`[Self-healing] KuzuDB nodes successfully synchronized. Found: ${data.nodes?.length} nodes`);
          }
        } catch (syncErr) {
          console.error(`[Self-healing] Failed to synchronize KuzuDB:`, syncErr);
        }
      }
    }

    const nodes = (data.nodes ?? [])
      .filter((n: any) => n.display_name && n.display_name.trim() !== '' && n.type && n.type.trim() !== '')
      .map(
        (n: { id: string; display_name: string; type: string; total_count: number; file_count: number }) => ({
          id: n.id,
          label: n.display_name,
          type: n.type as EntityType,
          fileCount: n.file_count,
          totalOccurrences: n.total_count,
          color: ENTITY_COLORS[n.type as EntityType] || '#6b7280',
        })
      );

    const response = {
      nodes,
      total: data.total ?? nodes.length,
      offset,
      has_more: data.has_more ?? false,
    };

    await redis.setex(cacheKey, RedisTTL.graph, JSON.stringify(response));
    return NextResponse.json(response);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: msg, code: ErrorCodes.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}
