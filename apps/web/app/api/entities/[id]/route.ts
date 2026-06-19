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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { type: newType, sessionId } = await req.json();

  if (!sessionId || !newType) {
    return NextResponse.json(
      { error: 'sessionId and type are required', code: ErrorCodes.VALIDATION_ERROR },
      { status: 400 }
    );
  }

  try {
    const resolvedId = await resolveEntityId(id);
    const entity = await prisma.entity.findUnique({
      where: { id: resolvedId },
    });

    if (!entity) {
      return NextResponse.json(
        { error: 'Entity not found', code: ErrorCodes.NOT_FOUND },
        { status: 404 }
      );
    }

    const { uuid5 } = await import('@/lib/uuid5');
    const newId = uuid5(`${newType}:${entity.canonical}`);

    if (resolvedId === newId) {
      return NextResponse.json({ success: true });
    }

    const files = await prisma.file.findMany({ where: { sessionId }, select: { id: true } });
    const fileIds = files.map((f) => f.id);

    await prisma.$transaction(async (tx) => {
      let targetEntity = await tx.entity.findUnique({
        where: { id: newId },
      });

      if (!targetEntity) {
        targetEntity = await tx.entity.create({
          data: {
            id: newId,
            canonical: entity.canonical,
            displayName: entity.displayName,
            type: newType,
            metadata: entity.metadata,
          },
        });
      }

      const oldOccurrences = await tx.occurrence.findMany({
        where: { entityId: resolvedId, fileId: { in: fileIds } },
      });

      for (const oldOcc of oldOccurrences) {
        const targetOcc = await tx.occurrence.findUnique({
          where: {
            fileId_entityId: {
              fileId: oldOcc.fileId,
              entityId: newId,
            },
          },
        });

        if (targetOcc) {
          const mergedCount = targetOcc.count + oldOcc.count;
          let mergedExcerptsStr: string | null = null;
          try {
            const targetEx = targetOcc.excerpts ? JSON.parse(targetOcc.excerpts) : [];
            const oldEx = oldOcc.excerpts ? JSON.parse(oldOcc.excerpts) : [];
            mergedExcerptsStr = JSON.stringify([...targetEx, ...oldEx]);
          } catch (e) {
            mergedExcerptsStr = targetOcc.excerpts || oldOcc.excerpts || null;
          }

          await tx.occurrence.update({
            where: { id: targetOcc.id },
            data: {
              count: mergedCount,
              excerpts: mergedExcerptsStr,
            },
          });

          await tx.occurrence.delete({
            where: { id: oldOcc.id },
          });
        } else {
          await tx.occurrence.update({
            where: { id: oldOcc.id },
            data: { entityId: newId },
          });
        }
      }

      const sourceNeighborhoods = await tx.entityNeighborhood.findMany({
        where: { sourceEntityId: resolvedId, fileId: { in: fileIds } },
      });
      for (const nb of sourceNeighborhoods) {
        if (newId === nb.targetEntityId) {
          await tx.entityNeighborhood.delete({ where: { id: nb.id } });
          continue;
        }
        const [src, tgt] = newId < nb.targetEntityId ? [newId, nb.targetEntityId] : [nb.targetEntityId, newId];
        const isSwapped = newId > nb.targetEntityId;
        const existingNb = await tx.entityNeighborhood.findUnique({
          where: { fileId_sourceEntityId_targetEntityId: { fileId: nb.fileId, sourceEntityId: src, targetEntityId: tgt } },
        });
        if (existingNb) {
          if (nb.weight > existingNb.weight) {
            await tx.entityNeighborhood.update({
              where: { id: existingNb.id },
              data: {
                weight: nb.weight,
                distance: nb.distance,
                snippet: nb.snippet,
                sourceOffset: isSwapped ? nb.targetOffset : nb.sourceOffset,
                targetOffset: isSwapped ? nb.sourceOffset : nb.targetOffset,
              },
            });
          }
          await tx.entityNeighborhood.delete({ where: { id: nb.id } });
        } else {
          await tx.entityNeighborhood.update({
            where: { id: nb.id },
            data: {
              sourceEntityId: src,
              targetEntityId: tgt,
              sourceOffset: isSwapped ? nb.targetOffset : nb.sourceOffset,
              targetOffset: isSwapped ? nb.sourceOffset : nb.targetOffset,
            },
          });
        }
      }

      const targetNeighborhoods = await tx.entityNeighborhood.findMany({
        where: { targetEntityId: resolvedId, fileId: { in: fileIds } },
      });
      for (const nb of targetNeighborhoods) {
        if (newId === nb.sourceEntityId) {
          await tx.entityNeighborhood.delete({ where: { id: nb.id } });
          continue;
        }
        const [src, tgt] = nb.sourceEntityId < newId ? [nb.sourceEntityId, newId] : [newId, nb.sourceEntityId];
        const isSwapped = nb.sourceEntityId > newId;
        const existingNb = await tx.entityNeighborhood.findUnique({
          where: { fileId_sourceEntityId_targetEntityId: { fileId: nb.fileId, sourceEntityId: src, targetEntityId: tgt } },
        });
        if (existingNb) {
          if (nb.weight > existingNb.weight) {
            await tx.entityNeighborhood.update({
              where: { id: existingNb.id },
              data: {
                weight: nb.weight,
                distance: nb.distance,
                snippet: nb.snippet,
                sourceOffset: isSwapped ? nb.targetOffset : nb.sourceOffset,
                targetOffset: isSwapped ? nb.sourceOffset : nb.targetOffset,
              },
            });
          }
          await tx.entityNeighborhood.delete({ where: { id: nb.id } });
        } else {
          await tx.entityNeighborhood.update({
            where: { id: nb.id },
            data: {
              sourceEntityId: src,
              targetEntityId: tgt,
              sourceOffset: isSwapped ? nb.targetOffset : nb.sourceOffset,
              targetOffset: isSwapped ? nb.sourceOffset : nb.targetOffset,
            },
          });
        }
      }

      const remainingOccurrences = await tx.occurrence.count({
        where: { entityId: resolvedId },
      });
      if (remainingOccurrences === 0) {
        await tx.entity.delete({
          where: { id: resolvedId },
        });
      }
    });

    try {
      await fetch(`${NLP_URL}/graph/node/${resolvedId}?file_ids=${fileIds.join(',')}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('[PATCH entity] Could not delete old node in Kuzu:', err);
    }

    try {
      const { syncSessionToKuzu } = await import('@/lib/api/sync');
      await syncSessionToKuzu(sessionId);
    } catch (err) {
      console.error('[PATCH entity] Sync to Kuzu failed:', err);
    }

    await clearSessionGraphCache(sessionId);

    return NextResponse.json({ success: true, newId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[PATCH entity] Unexpected error:', msg);
    return NextResponse.json({ error: msg, code: ErrorCodes.INTERNAL_ERROR }, { status: 500 });
  }
}
