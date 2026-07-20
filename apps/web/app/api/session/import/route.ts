import { NextRequest, NextResponse } from 'next/server';
import { ErrorCodes } from '@/types/api';
import { replaceSessionWithGraph } from '@/lib/api/graph-import';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      sessionId,
      nodes,
      edges,
      windowSize: customWindowSize,
    } = body;

    if (!Array.isArray(nodes) || !Array.isArray(edges)) {
      return NextResponse.json(
        { error: 'Invalid JSON graph format. Nodes and edges arrays are required.', code: ErrorCodes.VALIDATION_ERROR },
        { status: 400 }
      );
    }

    return NextResponse.json(await replaceSessionWithGraph({ ...body, sessionId, windowSize: customWindowSize }));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: msg, code: ErrorCodes.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}
