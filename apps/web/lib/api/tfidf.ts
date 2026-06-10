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
    const idf = Math.log(N / df) + 1.0;
    const tfidf = occ.count * idf;
    return {
      entity_id: occ.entityId,
      file_id: occ.fileId,
      tfidf,
    };
  });

  await prisma.$transaction(async (tx) => {
    for (const occ of occurrences) {
      const df = entityDfMap.get(occ.entityId) || 1;
      const idf = Math.log(N / df) + 1.0;
      const tfidf = occ.count * idf;
      await tx.occurrence.update({
        where: { id: occ.id },
        data: { tfidf },
      });
    }
  }, {
    maxWait: 15000,
    timeout: 30000,
  });

  try {
    const res = await fetch(`${NLP_URL}/graph/recompute-tfidf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      console.error(`KuzuDB TF-IDF recomputation failed, status: ${res.status}`);
    }
  } catch (err) {
    console.error('Failed to notify KuzuDB for TF-IDF recomputation:', err);
  }
}
