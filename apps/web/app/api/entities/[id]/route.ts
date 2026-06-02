import { NextRequest, NextResponse } from 'next/server';
import { clearSessionGraphCache } from '@/lib/redis';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/types/api';
import {
  resolveEntity,
  resolveEntityId,
  buildEntityFiles,
  buildCoOccurring,
  fetchNeighborhoods,
} from '@/lib/api/entity';

export const runtime = 'nodejs';

const NLP_URL = process.env.NLP_SERVICE_URL || 'http://localhost:8000';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessionId = new URL(req.url).searchParams.get('sessionId');

  try {
    const entity = await resolveEntity(id, sessionId);
    if (!entity) {
      return NextResponse.json(
        { error: 'Entity not found', code: ErrorCodes.NOT_FOUND },
        { status: 404 }
      );
    }

    const neighborhoods = sessionId ? await fetchNeighborhoods(entity.id, sessionId) : [];
    const files = buildEntityFiles(entity, neighborhoods);
    const coOccurringEntities = buildCoOccurring(entity, neighborhoods);
    const metadata =
      typeof entity.metadata === 'string' ? JSON.parse(entity.metadata) : entity.metadata;

    return NextResponse.json({
      id: entity.id,
      displayName: entity.displayName,
      type: entity.type,
      canonical: entity.canonical,
      metadata,
      files,
      coOccurringEntities,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg, code: ErrorCodes.INTERNAL_ERROR }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessionId = new URL(req.url).searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json(
      { error: 'sessionId required', code: ErrorCodes.VALIDATION_ERROR },
      { status: 400 }
    );
  }

  try {
    // Resolve all file IDs belonging to this session
    const files = await prisma.file.findMany({ where: { sessionId }, select: { id: true } });
    const fileIds = files.map((f) => f.id);
    console.log(`[DELETE entity] id=${id} sessionId=${sessionId} fileCount=${fileIds.length}`);

    // Resolve Prisma entity ID (may differ from KuzuDB UUID5 if referenced by canonical)
    const resolvedId = await resolveEntityId(id);
    console.log(`[DELETE entity] resolvedId=${resolvedId}`);

    // Remove from SQLite (occurrences + co-occurrence neighborhoods)
    const occDel = await prisma.occurrence.deleteMany({
      where: { entityId: resolvedId, fileId: { in: fileIds } },
    });
    const nbDel = await prisma.entityNeighborhood.deleteMany({
      where: {
        fileId: { in: fileIds },
        OR: [{ sourceEntityId: resolvedId }, { targetEntityId: resolvedId }],
      },
    });
    console.log(`[DELETE entity] Prisma: occurrences=${occDel.count} neighborhoods=${nbDel.count}`);

    // Propagate deletion to KuzuDB via the Python NLP service
    try {
      const kuzuRes = await fetch(`${NLP_URL}/graph/node/${id}?file_ids=${fileIds.join(',')}`, {
        method: 'DELETE',
      });
      if (!kuzuRes.ok) {
        const body = await kuzuRes.text().catch(() => '');
        console.error(`[DELETE entity] KuzuDB delete failed: ${kuzuRes.status} — ${body}`);
      } else {
        console.log(`[DELETE entity] KuzuDB delete OK`);
      }
    } catch (err) {
      console.error('[DELETE entity] Could not reach NLP service:', err);
    }

    // Invalidate the in-memory graph cache so the next fetch is fresh
    await clearSessionGraphCache(sessionId);
    console.log(`[DELETE entity] Cache invalidated for session ${sessionId}`);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[DELETE entity] Unexpected error:', msg);
    return NextResponse.json({ error: msg, code: ErrorCodes.INTERNAL_ERROR }, { status: 500 });
  }
}
