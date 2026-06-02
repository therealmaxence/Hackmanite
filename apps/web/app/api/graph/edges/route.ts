import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redis, RedisKeys, RedisTTL } from '@/lib/redis';
import { ErrorCodes } from '@/types/api';

export const runtime = 'nodejs';

const NLP_URL = process.env.NLP_SERVICE_URL || 'http://localhost:8000';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');
  // node_ids can be passed directly (for progressive loading after a batch)
  // OR derived from sessionId (legacy full-graph load)
  const nodeIds = searchParams.get('nodeIds');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!sessionId && !nodeIds) {
    return NextResponse.json(
      { error: 'sessionId or nodeIds required', code: ErrorCodes.VALIDATION_ERROR },
      { status: 400 }
    );
  }

  try {
    let ids: string[];

    if (nodeIds) {
      // Fast path: caller already knows the node IDs (used by progressive loader)
      ids = nodeIds.split(',').filter(Boolean);
    } else {
      // Resolve via session → files (SQLite) for legacy callers
      const cacheKey = `${RedisKeys.sessionGraph(sessionId!)}:edges:d=${from || 'any'}:${to || 'any'}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        return NextResponse.json(JSON.parse(cached));
      }

      const fileFrom = from ? new Date(from) : null;
      const fileTo = to ? new Date(to) : null;

      const files = await prisma.file.findMany({
        where: {
          sessionId: sessionId!,
          status: 'DONE',
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

      if (files.length === 0) {
        return NextResponse.json({ edges: [] });
      }

      // When no node_ids provided, fetch top 500 nodes first to build edge set
      const nodesRes = await fetch(
        `${NLP_URL}/graph/nodes?file_ids=${files.map((f) => f.id).join(',')}&limit=500&offset=0`,
        { cache: 'no-store' }
      );
      const nodesData = await nodesRes.json();
      ids = (nodesData.nodes ?? []).map((n: { id: string }) => n.id);
    }

    if (ids.length < 2) {
      return NextResponse.json({ edges: [] });
    }

    // Delegate edge query to KuzuDB via Python service
    const upstream = await fetch(
      `${NLP_URL}/graph/edges?node_ids=${ids.join(',')}`,
      { cache: 'no-store' }
    );
    if (!upstream.ok) {
      throw new Error(`Upstream graph service error ${upstream.status}`);
    }

    const data = await upstream.json();
    const edges = (data.edges ?? []).map(
      (e: { source: string; target: string; weight: number; distance: number }) => ({
        source: e.source,
        target: e.target,
        weight: e.weight,
      })
    );

    // Cache only when not using ephemeral nodeIds param
    if (!nodeIds && sessionId) {
      const cacheKey = `${RedisKeys.sessionGraph(sessionId)}:edges:d=${from || 'any'}:${to || 'any'}`;
      await redis.setex(cacheKey, RedisTTL.graph, JSON.stringify({ edges }));
    }

    return NextResponse.json({ edges });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: msg, code: ErrorCodes.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}
