import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { retryFile } from '@/lib/queue';
import { ErrorCodes } from '@/types/api';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, fileId, allFailed } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId required', code: ErrorCodes.VALIDATION_ERROR },
        { status: 400 }
      );
    }

    let retriedCount = 0;

    if (fileId) {
      await retryFile(fileId);
      retriedCount = 1;
    } else if (allFailed) {
      const failedFiles = await prisma.file.findMany({
        where: {
          sessionId,
          status: 'FAILED',
        },
        select: { id: true },
      });

      for (const file of failedFiles) {
        await retryFile(file.id);
        retriedCount++;
      }
    } else {
      return NextResponse.json(
        { error: 'Either fileId or allFailed is required', code: ErrorCodes.VALIDATION_ERROR },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      retriedCount,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: msg, code: ErrorCodes.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}
