import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redis, clearSessionGraphCache } from '@/lib/redis';
import { ErrorCodes } from '@/types/api';

export const runtime = 'nodejs';

const errMsg = (err: unknown) => (err instanceof Error ? err.message : 'Unknown error');

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;

  try {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { windowSize: true, minConnections: true, minOccurrences: true, minEdgeWeight: true, minTfidf: true, hiddenNodeIds: true },
    });

    if (!session)
      return NextResponse.json({ error: 'Session not found', code: ErrorCodes.NOT_FOUND }, { status: 404 });

    return NextResponse.json(session);
  } catch (err: unknown) {
    return NextResponse.json({ error: errMsg(err), code: ErrorCodes.INTERNAL_ERROR }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;

  try {
    const { windowSize, minConnections, minOccurrences, minEdgeWeight, minTfidf, hiddenNodeIds } = await req.json();

    const session = await prisma.session.update({
      where: { id: sessionId },
      data: {
        windowSize: typeof windowSize === 'number' ? windowSize : undefined,
        minConnections: typeof minConnections === 'number' ? minConnections : undefined,
        minOccurrences: typeof minOccurrences === 'number' ? minOccurrences : undefined,
        minEdgeWeight: typeof minEdgeWeight === 'number' ? minEdgeWeight : undefined,
        minTfidf: typeof minTfidf === 'number' ? minTfidf : undefined,
        hiddenNodeIds: typeof hiddenNodeIds === 'string' ? hiddenNodeIds : undefined,
      },
    });

    // Clear caches so the new default settings take effect immediately
    await Promise.all([
      clearSessionGraphCache(sessionId),
      redis.del(`session:window_size:${sessionId}`),
    ]);

    return NextResponse.json({
      success: true,
      settings: {
        windowSize: session.windowSize, minConnections: session.minConnections,
        minOccurrences: session.minOccurrences, minEdgeWeight: session.minEdgeWeight,
        minTfidf: session.minTfidf, hiddenNodeIds: session.hiddenNodeIds,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: errMsg(err), code: ErrorCodes.INTERNAL_ERROR }, { status: 500 });
  }
}
