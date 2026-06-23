import { prisma } from '@/lib/prisma';
import { recomputeSessionTfidf } from './tfidf';

const NLP_URL = process.env.NLP_SERVICE_URL || 'http://localhost:8000';
const activeSyncs = new Map<string, Promise<void>>();

const nlpPost = async (path: string, body: object): Promise<Response> => {
  const res = await fetch(`${NLP_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} failed: ${res.status} - ${await res.text()}`);
  return res;
};

export async function syncSessionToKuzu(sessionId: string): Promise<void> {
  const existing = activeSyncs.get(sessionId);
  if (existing) return existing;

  const promise = (async () => {
    const files = await prisma.file.findMany({ where: { sessionId, status: 'DONE' }, select: { id: true } });
    if (files.length === 0) return;

    const fileIds = files.map((f) => f.id);
    await nlpPost('/graph/files/delete', { file_ids: fileIds });
    await nlpPost('/graph/import', { file_ids: fileIds, nodes: [], edges: [] });

    const FILE_BATCH_SIZE = 50;
    for (let i = 0; i < fileIds.length; i += FILE_BATCH_SIZE) {
      const batchFileIds = fileIds.slice(i, i + FILE_BATCH_SIZE);

      const occurrences = await prisma.occurrence.findMany({
        where: { fileId: { in: batchFileIds } },
        include: { entity: true },
      });

      const entityMap = new Map<string, { entity: any; occurrences: any[] }>();
      for (const occ of occurrences) {
        const entity = occ.entity;
        if (!entity) continue;
        const cur = entityMap.get(entity.id) ?? { entity, occurrences: [] };
        cur.occurrences.push({ file_id: occ.fileId, count: occ.count, excerpts: occ.excerpts });
        entityMap.set(entity.id, cur);
      }

      const nodes = Array.from(entityMap.entries()).map(([entityId, val]) => ({
        id: entityId,
        canonical: val.entity.canonical,
        display_name: val.entity.displayName,
        type: val.entity.type,
        metadata: val.entity.metadata,
        occurrences: val.occurrences,
      }));

      const NODE_BATCH_SIZE = 1000;
      for (let j = 0; j < nodes.length; j += NODE_BATCH_SIZE) {
        await nlpPost('/graph/import', { file_ids: [], nodes: nodes.slice(j, j + NODE_BATCH_SIZE), edges: [] });
      }

      const neighborhoods = await prisma.entityNeighborhood.findMany({
        where: { fileId: { in: batchFileIds } },
        select: { sourceEntityId: true, targetEntityId: true, weight: true, distance: true, snippet: true, sourceOffset: true, targetOffset: true, fileId: true },
      });

      const edges = neighborhoods.map((n) => ({
        source: n.sourceEntityId, target: n.targetEntityId, weight: n.weight,
        distance: n.distance, snippet: n.snippet, source_offset: n.sourceOffset,
        target_offset: n.targetOffset, file_id: n.fileId,
      }));

      const EDGE_BATCH_SIZE = 5000;
      for (let j = 0; j < edges.length; j += EDGE_BATCH_SIZE) {
        await nlpPost('/graph/import', { file_ids: [], nodes: [], edges: edges.slice(j, j + EDGE_BATCH_SIZE) });
      }
    }

    try {
      await recomputeSessionTfidf(sessionId);
    } catch (err) {
      console.error('Failed to run TF-IDF recomputation after sync:', err);
    }
  })();

  activeSyncs.set(sessionId, promise);
  try {
    await promise;
  } finally {
    activeSyncs.delete(sessionId);
  }
}
