import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/types/api';
import { extractionQueue } from '@/lib/queue';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const sessionId = new URL(req.url).searchParams.get('sessionId');
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId parameter', code: ErrorCodes.VALIDATION_ERROR }, { status: 400 });
  }

  try {
    extractionQueue.processMemoryQueue?.().catch((err) => console.error('Failed to trigger background queue:', err));

    const files = await prisma.file.findMany({
      where: { sessionId },
      select: { id: true, status: true, errorMessage: true },
    });

    const fileIds = files.map((f) => f.id);
    const countMap = new Map<string, number>();
    if (fileIds.length > 0) {
      const counts = await prisma.occurrence.groupBy({
        by: ['fileId'],
        where: { fileId: { in: fileIds } },
        _count: { _all: true },
      });
      for (const c of counts) countMap.set(c.fileId, c._count._all);
    }

    return NextResponse.json({
      jobs: files.map((f) => ({ fileId: f.id, status: f.status, entityCount: countMap.get(f.id) ?? 0, error: f.errorMessage || null })),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg, code: ErrorCodes.INTERNAL_ERROR }, { status: 500 });
  }
}
