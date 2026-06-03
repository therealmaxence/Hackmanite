import { NextRequest, NextResponse } from 'next/server';
import { resumeStuckJobs } from '@/lib/queue';
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

    const resumedCount = await resumeStuckJobs(sessionId);

    return NextResponse.json({
      success: true,
      resumedCount,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: msg, code: ErrorCodes.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}
