import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/types/api';
import { syncSessionToKuzu } from '@/lib/api/entity';

export const runtime = 'nodejs';

const NLP_URL = process.env.NLP_SERVICE_URL || 'http://localhost:8000';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');
  const types = searchParams.get('types');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!sessionId) {
    return NextResponse.json(
      { error: 'sessionId required', code: ErrorCodes.VALIDATION_ERROR },
      { status: 400 }
    );
  }

  try {
    const fileFrom = from ? new Date(from) : null;
    const fileTo = to ? new Date(to) : null;

    const files = await prisma.file.findMany({
      where: {
        sessionId,
        status: 'DONE',
        ...(fileFrom || fileTo
          ? {
              originalCreatedAt: {
                ...(fileFrom ? { gte: fileFrom } : {}),
                ...(fileTo ? { lte: fileTo } : {}),
              },
            }
          : {}),
      },
      select: { id: true },
    });

    if (files.length === 0) {
      return NextResponse.json({ count: 0 });
    }

    const fileIds = files.map((f) => f.id);
    let upstream = await fetch(`${NLP_URL}/graph/node-count`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_ids: fileIds }),
      cache: 'no-store',
    });
    if (!upstream.ok) {
      throw new Error(`Upstream graph service error ${upstream.status}`);
    }

    let data = await upstream.json();

    if ((data.count === 0 || !data.count) && fileIds.length > 0) {
      const occurrenceCount = await prisma.occurrence.count({
        where: { fileId: { in: fileIds } },
      });
      if (occurrenceCount > 0) {
        console.log(`[Self-healing] KuzuDB count is empty for session ${sessionId}. Syncing from SQLite...`);
        try {
          await syncSessionToKuzu(sessionId);
          // Re-fetch count after successful sync
          upstream = await fetch(`${NLP_URL}/graph/node-count`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file_ids: fileIds }),
            cache: 'no-store',
          });
          if (upstream.ok) {
            data = await upstream.json();
            console.log(`[Self-healing] KuzuDB successfully synchronized. New count: ${data.count}`);
          }
        } catch (syncErr) {
          console.error(`[Self-healing] Failed to synchronize KuzuDB:`, syncErr);
        }
      }
    }
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { hiddenNodeIds: true },
    });
    const hiddenNodeIds: string[] = JSON.parse(session?.hiddenNodeIds || '[]');

    let finalCount = data.count ?? 0;
    if (hiddenNodeIds.length > 0 && fileIds.length > 0) {
      const hiddenUniqueEntities = await prisma.occurrence.groupBy({
        by: ['entityId'],
        where: {
          fileId: { in: fileIds },
          entityId: { in: hiddenNodeIds },
        },
      });
      finalCount = Math.max(0, finalCount - hiddenUniqueEntities.length);
    }

    return NextResponse.json({ count: finalCount });
  } catch (err: unknown) {
    console.error('Graph Count API Error:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: msg, code: ErrorCodes.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}
