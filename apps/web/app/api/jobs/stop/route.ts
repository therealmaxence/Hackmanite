import { NextRequest, NextResponse } from 'next/server';
import { cancelSessionExtraction } from '@/lib/queue';
import { ErrorCodes } from '@/types/api';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required', code: ErrorCodes.VALIDATION_ERROR }, { status: 400 });
    }

    const cancelledCount = await cancelSessionExtraction(sessionId);
    return NextResponse.json({ success: true, cancelledCount });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg, code: ErrorCodes.INTERNAL_ERROR }, { status: 500 });
  }
}

