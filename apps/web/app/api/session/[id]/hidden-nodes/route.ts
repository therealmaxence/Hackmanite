import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/types/api';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;

  try {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { hiddenNodeIds: true },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found', code: ErrorCodes.NOT_FOUND },
        { status: 404 }
      );
    }

    const hiddenIds: string[] = JSON.parse(session.hiddenNodeIds || '[]');

    const entities = await prisma.entity.findMany({
      where: { id: { in: hiddenIds } },
      select: {
        id: true,
        displayName: true,
        type: true,
      },
    });

    return NextResponse.json({ nodes: entities });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: msg, code: ErrorCodes.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}
