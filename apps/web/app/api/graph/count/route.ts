import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/types/api';
import { syncSessionToKuzu } from '@/lib/api/entity';

export const runtime = 'nodejs';

const NLP_URL = process.env.NLP_SERVICE_URL || 'http://localhost:8000';

const nlpNodeCount = async (fileIds: string[]) => {
  const res = await fetch(`${NLP_URL}/graph/node-count`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_ids: fileIds }), cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Upstream graph service error ${res.status}`);
  return res.json();
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required', code: ErrorCodes.VALIDATION_ERROR }, { status: 400 });
  }

  try {
    const fileFrom = from ? new Date(from) : null;
    const fileTo = to ? new Date(to) : null;
    const files = await prisma.file.findMany({
      where: {
        sessionId, status: 'DONE',
        ...(fileFrom || fileTo ? { originalCreatedAt: { ...(fileFrom ? { gte: fileFrom } : {}), ...(fileTo ? { lte: fileTo } : {}) } } : {}),
      },
      select: { id: true },
    });

    if (!files.length) return NextResponse.json({ count: 0 });

    const fileIds = files.map((f) => f.id);
    let data = await nlpNodeCount(fileIds);

    if (!data.count && fileIds.length > 0) {
      const occurrenceCount = await prisma.occurrence.count({ where: { fileId: { in: fileIds } } });
      if (occurrenceCount > 0) {
        try { await syncSessionToKuzu(sessionId); data = await nlpNodeCount(fileIds); } catch { /* non-fatal */ }
      }
    }

    const session = await prisma.session.findUnique({ where: { id: sessionId }, select: { hiddenNodeIds: true } });
    const hiddenNodeIds: string[] = JSON.parse(session?.hiddenNodeIds || '[]');

    let finalCount = data.count ?? 0;
    if (hiddenNodeIds.length > 0) {
      const hiddenUnique = await prisma.occurrence.groupBy({
        by: ['entityId'],
        where: { fileId: { in: fileIds }, entityId: { in: hiddenNodeIds } },
      });
      finalCount = Math.max(0, finalCount - hiddenUnique.length);
    }

    return NextResponse.json({ count: finalCount });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg, code: ErrorCodes.INTERNAL_ERROR }, { status: 500 });
  }
}
