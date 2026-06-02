import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/session';
import { ErrorCodes } from '@/types/api';
import { getSessionStats } from '@/lib/api/stats';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const session = await getServerSession();
  const sessionId = searchParams.get('sessionId') || session?.sessionId;
  const limit = Math.min(Number(searchParams.get('limit') || 15), 100);
  const types = (searchParams.get('types')?.split(',').filter(Boolean) || []).filter(
    (t) => t !== 'FILE'
  );
  const search = searchParams.get('search') || '';

  if (!sessionId) {
    return NextResponse.json(
      { error: 'Session not found', code: ErrorCodes.VALIDATION_ERROR },
      { status: 400 }
    );
  }

  try {
    const stats = await getSessionStats({ sessionId, types, search, limit });
    return NextResponse.json(stats);
  } catch (err: unknown) {
    console.error('Stats API Error:', err);
    return NextResponse.json(
      { error: 'Internal Server Error', code: ErrorCodes.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}
