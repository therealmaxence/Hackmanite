import { prisma } from '@/lib/prisma';
import { clearSessionGraphCache, redis } from '@/lib/redis';
import { deleteSession } from '@/lib/delete-session';
import { ImportInput, importSessionData } from '@/lib/api/session-import';

export async function replaceSessionWithGraph(body: ImportInput) {
  if (body.sessionId && await prisma.session.findUnique({ where: { id: body.sessionId }, select: { id: true } })) {
    await deleteSession(body.sessionId);
  }

  const windowSize = typeof body.windowSize === 'number' ? body.windowSize : 400;
  const { session, filesCreated, occurrencesCreated, emailsRestoredCount } = await importSessionData({ ...body, windowSize });

  await redis.setex(`session:window_size:${session.id}`, 24 * 60 * 60, String(windowSize));
  await clearSessionGraphCache(session.id);

  return {
    sessionId: session.id,
    files: filesCreated.map((file) => ({
      fileId: file.id,
      jobId: `imported-${file.id}`,
      originalName: file.originalName,
      status: 'DONE' as const,
      entityCount: occurrencesCreated.filter((occ) => occ.fileId === file.id).length,
      error: null,
      sizeBytes: Number(file.sizeBytes),
      mimeType: file.mimeType,
      addedAt: file.uploadedAt.getTime(),
    })),
    emailsRestoredCount,
  };
}
