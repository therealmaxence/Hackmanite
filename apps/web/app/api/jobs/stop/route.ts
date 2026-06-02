import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cancelSessionExtraction } from '@/lib/queue';
import { ErrorCodes } from '@/types/api';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId required', code: ErrorCodes.VALIDATION_ERROR },
        { status: 400 }
      );
    }

    const cancelledFileIds = await cancelSessionExtraction(sessionId);

    // Update the DB so the frontend knows they were cancelled
    if (cancelledFileIds.length > 0) {
      await prisma.file.updateMany({
        where: { id: { in: cancelledFileIds } },
        data: {
          status: 'FAILED',
          errorMessage: 'Cancelled by user',
        },
      });
    }

    return NextResponse.json({
      success: true,
      cancelledCount: cancelledFileIds.length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: msg, code: ErrorCodes.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}
