import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redis, clearSessionGraphCache } from '@/lib/redis';
import { ErrorCodes } from '@/types/api';
import { deleteSession } from '@/lib/delete-session';
import { importSessionData } from '@/lib/api/session-import';

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

    if (sessionId) {
      const existingSession = await prisma.session.findUnique({
        where: { id: sessionId },
        select: { id: true },
      });
      if (existingSession) {
        await deleteSession(sessionId);
      }
    }

    const windowSize = typeof customWindowSize === 'number' ? customWindowSize : 400;

    const { session, filesCreated, occurrencesCreated, emailsRestoredCount } = await importSessionData(body);

    await redis.setex(`session:window_size:${session.id}`, 24 * 60 * 60, String(windowSize));
    await clearSessionGraphCache(session.id);

    const files = filesCreated.map((f) => {
      const entityCount = occurrencesCreated.filter((occ) => occ.fileId === f.id).length;
      return {
        fileId: f.id,
        jobId: `imported-${f.id}`,
        originalName: f.originalName,
        status: 'DONE' as const,
        entityCount,
        error: null,
        sizeBytes: Number(f.sizeBytes),
        mimeType: f.mimeType,
        addedAt: f.uploadedAt.getTime(),
      };
    });

    return NextResponse.json({
      sessionId: session.id,
      files,
      emailsRestoredCount,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: msg, code: ErrorCodes.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}
