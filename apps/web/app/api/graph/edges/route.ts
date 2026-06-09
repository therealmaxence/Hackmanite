import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redis, RedisKeys, RedisTTL } from '@/lib/redis';
import { ErrorCodes } from '@/types/api';

export const runtime = 'nodejs';

const NLP_URL = process.env.NLP_SERVICE_URL || 'http://localhost:8000';

async function fetchEdges({
  sessionId,
  nodeIds,
  from,
  to,
}: {
  sessionId?: string | null;
  nodeIds?: string | string[] | null;
  from?: string | null;
  to?: string | null;
}) {
  if (!sessionId && !nodeIds) {
    throw new Error('sessionId or nodeIds required');
  }

  let hiddenIds = new Set<string>();
  if (sessionId) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { hiddenNodeIds: true },
    });
    hiddenIds = new Set<string>(JSON.parse(session?.hiddenNodeIds || '[]'));
  }

  let ids: string[];

  if (nodeIds) {
    if (Array.isArray(nodeIds)) {
      ids = nodeIds.filter(Boolean);
    } else {
      ids = nodeIds.split(',').filter(Boolean);
    }
  } else {
    const cacheKey = `${RedisKeys.sessionGraph(sessionId!)}:edges:d=${from || 'any'}:${to || 'any'}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
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
      return { edges: [] };
    }

    const nodesRes = await fetch(`${NLP_URL}/graph/nodes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_ids: files.map((f) => f.id),
        limit: 500,
        offset: 0,
      }),
      cache: 'no-store',
    });
    const nodesData = await nodesRes.json();
    ids = (nodesData.nodes ?? []).map((n: { id: string }) => n.id);
  }

  // Filter out hidden IDs
  ids = ids.filter((id) => !hiddenIds.has(id));

  if (ids.length < 2) {
    return { edges: [] };
  }

  const upstream = await fetch(`${NLP_URL}/graph/edges`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ node_ids: ids }),
    cache: 'no-store',
  });
  if (!upstream.ok) {
    throw new Error(`Upstream graph service error ${upstream.status}`);
  }

  const data = await upstream.json();
  const edges = (data.edges ?? [])
    .filter((e: { source: string; target: string }) => !hiddenIds.has(e.source) && !hiddenIds.has(e.target))
    .map(
      (e: { source: string; target: string; weight: number; distance: number }) => ({
        source: e.source,
        target: e.target,
        weight: e.weight,
      })
    );

  if (!nodeIds && sessionId) {
    const cacheKey = `${RedisKeys.sessionGraph(sessionId)}:edges:d=${from || 'any'}:${to || 'any'}`;
    await redis.setex(cacheKey, RedisTTL.graph, JSON.stringify({ edges }));
  }

  return { edges };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');
  const nodeIds = searchParams.get('nodeIds');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  try {
    const result = await fetchEdges({ sessionId, nodeIds, from, to });
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Graph Edges GET API Error:', err);
    return NextResponse.json(
      { error: err.message || 'Unknown error', code: ErrorCodes.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await fetchEdges({
      sessionId: body.sessionId,
      nodeIds: body.nodeIds,
      from: body.from,
      to: body.to,
    });
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Graph Edges POST API Error:', err);
    return NextResponse.json(
      { error: err.message || 'Unknown error', code: ErrorCodes.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}
