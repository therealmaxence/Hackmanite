import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/types/api';
import { retryFile, extractionQueue } from '@/lib/queue';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { sessionId, fileId, allFailed } = await req.json();
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required', code: ErrorCodes.VALIDATION_ERROR }, { status: 400 });
    }
    if (!fileId && !allFailed) {
      return NextResponse.json({ error: 'Either fileId or allFailed is required', code: ErrorCodes.VALIDATION_ERROR }, { status: 400 });
    }

    let retriedCount = 0;
    if (fileId) {
      await retryFile(fileId);
      retriedCount = 1;
    } else {
      const failedFiles = await prisma.file.findMany({
        where: { sessionId, status: { in: ['FAILED', 'CANCELLED'] } },
        select: { id: true },
      });
      for (const file of failedFiles) {
        await retryFile(file.id);
        retriedCount++;
      }
    }

    // Trigger queue processing immediately for desktop memory queue
    extractionQueue.processMemoryQueue?.().catch((err) => console.error('Failed to trigger background queue on retry:', err));

    return NextResponse.json({ success: true, retriedCount });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg, code: ErrorCodes.INTERNAL_ERROR }, { status: 500 });
  }
}
