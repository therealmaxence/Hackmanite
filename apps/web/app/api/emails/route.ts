import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/session';
import { ErrorCodes } from '@/types/api';
import { buildEmailDAG } from '@/lib/api/email';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const session = await getServerSession();
  const sessionId = searchParams.get('sessionId') || session?.sessionId;

  if (!sessionId) {
    return NextResponse.json(
      { error: 'Session not found', code: ErrorCodes.VALIDATION_ERROR },
      { status: 400 }
    );
  }

  try {
    const emails = await prisma.email.findMany({
      where: { file: { sessionId } },
      include: { file: { select: { originalName: true } } },
      orderBy: { date: 'asc' },
    });

    const { dag, stats } = buildEmailDAG(emails);
    return NextResponse.json({ emails, dag, stats });
  } catch (err: unknown) {
    console.error('Emails Query API Error:', err);
    return NextResponse.json(
      { error: 'Internal Server Error', code: ErrorCodes.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const messageId = searchParams.get('messageId');

  if (!messageId) {
    return NextResponse.json(
      { error: 'Message ID parameter required', code: ErrorCodes.VALIDATION_ERROR },
      { status: 400 }
    );
  }

  try {
    await prisma.email.delete({
      where: { messageId },
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Delete Email API Error:', err);
    return NextResponse.json(
      { error: 'Internal Server Error', code: ErrorCodes.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}
