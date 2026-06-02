import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/types/api';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing sessionId parameter', code: ErrorCodes.VALIDATION_ERROR },
        { status: 400 }
      );
    }

    const files = await prisma.file.findMany({
      where: { sessionId },
      select: {
        id: true,
        status: true,
        errorMessage: true,
      },
    });

    const fileIds = files.map((f) => f.id);
    let countMap = new Map<string, number>();

    if (fileIds.length > 0) {
      const counts = await prisma.occurrence.groupBy({
        by: ['fileId'],
        where: {
          fileId: { in: fileIds },
        },
        _count: {
          _all: true,
        },
      });
      countMap = new Map(counts.map((c) => [c.fileId, c._count._all]));
    }

    const jobStatuses = files.map((f) => ({
      fileId: f.id,
      status: f.status, // 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED'
      entityCount: countMap.get(f.id) || 0,
      error: f.errorMessage || null,
    }));

    return NextResponse.json({ jobs: jobStatuses });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: msg, code: ErrorCodes.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}
