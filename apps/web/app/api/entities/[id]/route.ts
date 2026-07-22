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
import { uuid5 } from '@/lib/uuid5';
import { syncSessionToKuzu } from '@/lib/api/sync';
import { NLP_URL } from '@/lib/nlp-url';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

const errMsg = (err: unknown) => (err instanceof Error ? err.message : 'Unknown error');
const internalError = (msg: string) =>
  NextResponse.json({ error: msg, code: ErrorCodes.INTERNAL_ERROR }, { status: 500 });

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessionId = new URL(req.url).searchParams.get('sessionId');

  try {
    const entity = await resolveEntity(id, sessionId);
    if (!entity)
      return NextResponse.json({ error: 'Entity not found', code: ErrorCodes.NOT_FOUND }, { status: 404 });

    const neighborhoods = sessionId ? await fetchNeighborhoods(entity.id, sessionId) : [];
    const metadata = typeof entity.metadata === 'string' ? JSON.parse(entity.metadata) : entity.metadata;

    return NextResponse.json({
      id: entity.id,
      displayName: entity.displayName,
      type: entity.type,
      canonical: entity.canonical,
      metadata,
      files: buildEntityFiles(entity, neighborhoods),
      coOccurringEntities: buildCoOccurring(entity, neighborhoods),
    });
  } catch (err: unknown) {
    return internalError(errMsg(err));
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessionId = new URL(req.url).searchParams.get('sessionId');

  if (!sessionId)
    return NextResponse.json({ error: 'sessionId required', code: ErrorCodes.VALIDATION_ERROR }, { status: 400 });

  try {
    const fileIds = (await prisma.file.findMany({ where: { sessionId }, select: { id: true } })).map((f) => f.id);
    logger.info(`[DELETE entity] id=${id} sessionId=${sessionId} fileCount=${fileIds.length}`);

    const resolvedId = await resolveEntityId(id);
    logger.info(`[DELETE entity] resolvedId=${resolvedId}`);

    const occDel = await prisma.occurrence.deleteMany({
      where: { entityId: resolvedId, fileId: { in: fileIds } },
    });
    const nbDel = await prisma.entityNeighborhood.deleteMany({
      where: { fileId: { in: fileIds }, OR: [{ sourceEntityId: resolvedId }, { targetEntityId: resolvedId }] },
    });
    logger.info(`[DELETE entity] Prisma: occurrences=${occDel.count} neighborhoods=${nbDel.count}`);

    try {
      const kuzuRes = await fetch(`${NLP_URL}/graph/node/${id}?file_ids=${fileIds.join(',')}`, { method: 'DELETE' });
      if (!kuzuRes.ok)
        logger.error(`[DELETE entity] KuzuDB delete failed: ${kuzuRes.status} — ${await kuzuRes.text().catch(() => '')}`);
      else
        logger.info(`[DELETE entity] KuzuDB delete OK`);
    } catch (err) {
      logger.error('[DELETE entity] Could not reach NLP service:', { err });
    }

    await clearSessionGraphCache(sessionId);
    logger.info(`[DELETE entity] Cache invalidated for session ${sessionId}`);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = errMsg(err);
    logger.error('[DELETE entity] Unexpected error:', { msg });
    return internalError(msg);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { type: newType, canonical: newCanonical, displayName: newDisplayName, occurrences, files, sessionId } = await req.json();

  if (!sessionId)
    return NextResponse.json({ error: 'sessionId is required', code: ErrorCodes.VALIDATION_ERROR }, { status: 400 });

  try {
    const resolvedId = await resolveEntityId(id);
    const entity = await prisma.entity.findUnique({ where: { id: resolvedId } });

    if (!entity)
      return NextResponse.json({ error: 'Entity not found', code: ErrorCodes.NOT_FOUND }, { status: 404 });

    const finalType = newType || entity.type;
    const finalCanonical = newCanonical || entity.canonical;
    const finalDisplayName = newDisplayName || entity.displayName;

    const newId = uuid5(`${finalType}:${finalCanonical}`);
    const fileIds = (await prisma.file.findMany({ where: { sessionId }, select: { id: true } })).map((f) => f.id);

    await prisma.$transaction(async (tx) => {
      if (files && Array.isArray(files)) {
        for (const f of files) {
          await tx.file.update({
            where: { id: f.fileId },
            data: { originalName: f.fileName }
          });
        }
      }

      if (occurrences && Array.isArray(occurrences)) {
        for (const occ of occurrences) {
          await tx.occurrence.update({
            where: {
              fileId_entityId: {
                fileId: occ.fileId,
                entityId: resolvedId,
              }
            },
            data: {
              count: occ.count !== undefined ? Number(occ.count) : undefined,
              tfidf: occ.tfidf !== undefined ? Number(occ.tfidf) : undefined,
            }
          });
        }
      }

      if (resolvedId !== newId) {
        if (!await tx.entity.findUnique({ where: { id: newId } })) {
          await tx.entity.create({
            data: { id: newId, canonical: finalCanonical, displayName: finalDisplayName, type: finalType, metadata: entity.metadata },
          });
        } else {
          await tx.entity.update({
            where: { id: newId },
            data: { displayName: finalDisplayName }
          });
        }

        const oldOccurrences = await tx.occurrence.findMany({
          where: { entityId: resolvedId, fileId: { in: fileIds } },
        });

        for (const oldOcc of oldOccurrences) {
          const targetOcc = await tx.occurrence.findUnique({
            where: { fileId_entityId: { fileId: oldOcc.fileId, entityId: newId } },
          });

          if (targetOcc) {
            let mergedExcerptsStr: string | null = null;
            try {
              const targetEx = targetOcc.excerpts ? JSON.parse(targetOcc.excerpts) : [];
              const oldEx = oldOcc.excerpts ? JSON.parse(oldOcc.excerpts) : [];
              mergedExcerptsStr = JSON.stringify([...targetEx, ...oldEx]);
            } catch {
              mergedExcerptsStr = targetOcc.excerpts || oldOcc.excerpts || null;
            }
            await tx.occurrence.update({ where: { id: targetOcc.id }, data: { count: targetOcc.count + oldOcc.count, excerpts: mergedExcerptsStr } });
            await tx.occurrence.delete({ where: { id: oldOcc.id } });
          } else {
            await tx.occurrence.update({ where: { id: oldOcc.id }, data: { entityId: newId } });
          }
        }

        const mergeNeighborhood = async (nb: Awaited<ReturnType<typeof tx.entityNeighborhood.findMany>>[number], otherId: string) => {
          if (newId === otherId) { await tx.entityNeighborhood.delete({ where: { id: nb.id } }); return; }
          const [src, tgt] = newId < otherId ? [newId, otherId] : [otherId, newId];
          const isSwapped = newId > otherId;
          const existingNb = await tx.entityNeighborhood.findUnique({
            where: { fileId_sourceEntityId_targetEntityId: { fileId: nb.fileId, sourceEntityId: src, targetEntityId: tgt } },
          });
          if (existingNb) {
            if (nb.weight > existingNb.weight) {
              await tx.entityNeighborhood.update({
                where: { id: existingNb.id },
                data: { weight: nb.weight, distance: nb.distance, snippet: nb.snippet, sourceOffset: isSwapped ? nb.targetOffset : nb.sourceOffset, targetOffset: isSwapped ? nb.sourceOffset : nb.targetOffset },
              });
            }
            await tx.entityNeighborhood.delete({ where: { id: nb.id } });
          } else {
            await tx.entityNeighborhood.update({
              where: { id: nb.id },
              data: { sourceEntityId: src, targetEntityId: tgt, sourceOffset: isSwapped ? nb.targetOffset : nb.sourceOffset, targetOffset: isSwapped ? nb.sourceOffset : nb.targetOffset },
            });
          }
        };

        for (const nb of await tx.entityNeighborhood.findMany({ where: { sourceEntityId: resolvedId, fileId: { in: fileIds } } }))
          await mergeNeighborhood(nb, nb.targetEntityId);

        for (const nb of await tx.entityNeighborhood.findMany({ where: { targetEntityId: resolvedId, fileId: { in: fileIds } } }))
          await mergeNeighborhood(nb, nb.sourceEntityId);

        if (await tx.occurrence.count({ where: { entityId: resolvedId } }) === 0)
          await tx.entity.delete({ where: { id: resolvedId } });
      } else {
        await tx.entity.update({
          where: { id: resolvedId },
          data: { displayName: finalDisplayName }
        });
      }
    });

    try {
      if (resolvedId !== newId) {
        await fetch(`${NLP_URL}/graph/node/${resolvedId}?file_ids=${fileIds.join(',')}`, { method: 'DELETE' });
      }
    } catch (err) {
      console.error('[PATCH entity] Could not delete old node in Kuzu:', err);
    }

    try {
      await syncSessionToKuzu(sessionId);
    } catch (err) {
      console.error('[PATCH entity] Sync to Kuzu failed:', err);
    }

    await clearSessionGraphCache(sessionId);
    return NextResponse.json({ success: true, newId });
  } catch (err: unknown) {
    const msg = errMsg(err);
    console.error('[PATCH entity] Unexpected error:', msg);
    return internalError(msg);
  }
}
