import { NextRequest, NextResponse } from 'next/server';
import { ErrorCodes } from '@/types/api';
import { buildSessionGraphExport } from '@/lib/sessionGraph';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;

  try {
    return NextResponse.json(await buildSessionGraphExport(sessionId));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg, code: ErrorCodes.INTERNAL_ERROR }, { status: 500 });
  }
}