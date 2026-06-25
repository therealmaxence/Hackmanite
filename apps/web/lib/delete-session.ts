import { prisma } from '@/lib/prisma';
import { clearSessionGraphCache } from '@/lib/redis';
import { cancelSessionExtraction } from '@/lib/queue';
import { NLP_URL } from '@/lib/nlp-url';

export async function deleteSession(sessionId: string): Promise<void> {
  await cancelSessionExtraction(sessionId);
  const fileIds = (await prisma.file.findMany({ where: { sessionId }, select: { id: true } })).map((f) => f.id);
  if (fileIds.length > 0) {
    try {
      const url = `${NLP_URL}/graph/files/delete`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_ids: fileIds }),
      });
      if (!res.ok) console.error(`Failed to delete session files in KuzuDB, status: ${res.status}`);
    } catch (err) {
      console.error('Failed to contact Python service for session KuzuDB cleanup:', err);
    }
  }
  await prisma.session.delete({ where: { id: sessionId } });
  await clearSessionGraphCache(sessionId);
}
