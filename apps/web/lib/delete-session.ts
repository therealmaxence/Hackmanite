import { prisma } from '@/lib/prisma';
import { clearSessionGraphCache } from '@/lib/redis';

export async function deleteSession(sessionId: string): Promise<void> {
  const files = await prisma.file.findMany({
    where: { sessionId },
    select: { id: true },
  });
  const fileIds = files.map((f) => f.id);

  try {
    const nlpUrl = process.env.NLP_SERVICE_URL || 'http://localhost:8000';
    await Promise.all(
      fileIds.map(async (fileId) => {
        const res = await fetch(`${nlpUrl}/graph/file/${fileId}`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          console.error(`Failed to delete session file ${fileId} in KuzuDB, status: ${res.status}`);
        }
      })
    );
  } catch (err) {
    console.error('Failed to contact Python service for session KuzuDB cleanup:', err);
  }

  await prisma.session.delete({
    where: { id: sessionId },
  });

  await clearSessionGraphCache(sessionId);
}
