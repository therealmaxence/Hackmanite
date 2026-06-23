import { prisma } from '@/lib/prisma';

const NLP_URL = process.env.NLP_SERVICE_URL || 'http://localhost:8000';

export async function recomputeSessionTfidf(sessionId: string): Promise<void> {
  const files = await prisma.file.findMany({
    where: { sessionId, status: 'DONE' },
    select: { id: true },
  });

  const N = files.length;
  if (N === 0) return;

  const fileIds = files.map((f) => f.id);
  const occurrences = await prisma.occurrence.findMany({
    where: { fileId: { in: fileIds } },
    select: { id: true, entityId: true, fileId: true, count: true },
  });

  const entityDfMap = new Map<string, number>();
  for (const occ of occurrences) {
    entityDfMap.set(occ.entityId, (entityDfMap.get(occ.entityId) || 0) + 1);
  }

  const updates = occurrences.map((occ) => {
    const df = entityDfMap.get(occ.entityId) || 1;
    const tfidf = occ.count * (Math.log(N / df) + 1.0);
    return { id: occ.id, entity_id: occ.entityId, file_id: occ.fileId, tfidf };
  });

  await prisma.$transaction(async (tx) => {
    const BATCH_SIZE = 200;
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const chunk = updates.slice(i, i + BATCH_SIZE);
      const ids = chunk.map((u) => u.id);
      let sql = 'UPDATE occurrences SET tfidf = CASE id';
      const params: any[] = [];
      for (const u of chunk) { sql += ' WHEN ? THEN ?'; params.push(u.id, u.tfidf); }
      sql += ` END WHERE id IN (${ids.map(() => '?').join(', ')})`;
      params.push(...ids);
      await tx.$executeRawUnsafe(sql, ...params);
    }
  }, { maxWait: 15000, timeout: 30000 });

  try {
    const res = await fetch(`${NLP_URL}/graph/recompute-tfidf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates: updates.map(({ entity_id, file_id, tfidf }) => ({ entity_id, file_id, tfidf })) }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) console.error(`KuzuDB TF-IDF recomputation failed, status: ${res.status}`);
  } catch (err) {
    console.error('Failed to notify KuzuDB for TF-IDF recomputation:', err);
  }
}
