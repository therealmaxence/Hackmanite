import { NodeHandler } from '../../executor';
import { NLP_URL } from '@/lib/nlp-url';
import { requireGraphInput } from '../shared';
import { prisma } from '@/lib/prisma';
import { SESSION_TTL_MS } from '@/lib/api/upload';
import { clearSessionGraphCache } from '@/lib/redis';
import { recomputeSessionTfidf } from '@/lib/api/tfidf';
import { uuid5 } from '@/lib/uuid5';

function collectFileMetadata(input: any) {
  const metadata = new Map<string, { fileName?: string; mimeType?: string }>();
  const add = (fileId?: string, fileName?: string, mimeType?: string) => {
    if (!fileId) return;
    const current = metadata.get(fileId) || {};
    metadata.set(fileId, { fileName: current.fileName || fileName, mimeType: current.mimeType || mimeType });
  };
  for (const node of input.nodes || []) for (const occ of node.occurrences || []) add(occ.fileId, occ.fileName, occ.mimeType);
  for (const edge of input.edges || []) add(edge.fileId, edge.fileName, edge.mimeType);
  return metadata;
}

function jsonString(value: any, fallback: any) {
  if (typeof value === 'string') {
    try {
      JSON.parse(value);
      return value;
    } catch {
      return JSON.stringify(fallback);
    }
  }
  return JSON.stringify(value ?? fallback);
}

async function ensureSessionFiles(input: any, fileIds: string[], sessionId: string | undefined, context: any) {
  if (!sessionId || fileIds.length === 0) return;
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.upsert({ where: { id: sessionId }, update: { expiresAt }, create: { id: sessionId, expiresAt } });

  const existing = new Set((await prisma.file.findMany({ where: { id: { in: fileIds } }, select: { id: true } })).map((file) => file.id));
  const metadata = collectFileMetadata(input);
  const now = new Date();
  const safeRunId = context.runId.replace(/[^\w.-]/g, '_');
  let created = 0;
  for (const fileId of fileIds) {
    if (existing.has(fileId)) continue;
    const meta = metadata.get(fileId) || {};
    try {
      await prisma.file.create({
        data: {
          id: fileId,
          sessionId,
          originalName: meta.fileName || `${fileId}.txt`,
          storagePath: `pipeline/${safeRunId}/${fileId.replace(/[^\w.-]/g, '_')}`,
          mimeType: meta.mimeType || 'text/plain',
          sizeBytes: BigInt(0),
          status: 'DONE',
          processedAt: now,
          originalCreatedAt: now,
        },
      });
      created += 1;
    } catch (err: any) {
      if (err?.code !== 'P2002') throw err;
    }
  }
  if (created > 0) await context.log(`Registered ${created} pipeline file reference${created === 1 ? '' : 's'} for graph-page visibility.`);
}

async function persistGraphToPrisma(input: any, fallbackFileId: string, sessionId: string | undefined, context: any) {
  if (!sessionId) return;

  let occurrenceCount = 0;
  let neighborhoodCount = 0;
  const entityIdByNodeId = new Map<string, string>();

  await prisma.$transaction(async (tx) => {
    for (const node of input.nodes || []) {
      const canonical = String(node.canonical || node.label || node.displayName || '').slice(0, 500);
      const type = String(node.type || '').slice(0, 100);
      if (!canonical || !type) continue;

      const entity = await tx.entity.upsert({
        where: { canonical_type: { canonical, type } },
        create: {
          id: node.id || uuid5(`${type}:${canonical}`),
          canonical,
          displayName: String(node.label || node.displayName || canonical).slice(0, 500),
          type,
          metadata: jsonString(node.metadata, {}),
        },
        update: {},
      });
      if (node.id) entityIdByNodeId.set(node.id, entity.id);

      for (const occ of node.occurrences || []) {
        const fileId = occ.fileId || fallbackFileId;
        await tx.occurrence.upsert({
          where: { fileId_entityId: { fileId, entityId: entity.id } },
          create: {
            entityId: entity.id,
            fileId,
            count: Math.max(1, Number(occ.count) || 1),
            excerpts: jsonString(occ.excerpts, []),
            tfidf: Number(occ.tfidf) || 0,
          },
          update: {
            count: Math.max(1, Number(occ.count) || 1),
            excerpts: jsonString(occ.excerpts, []),
            tfidf: Number(occ.tfidf) || 0,
          },
        });
        occurrenceCount += 1;
      }
    }

    const neighborhoods = new Map<string, any>();
    for (const edge of input.edges || []) {
      const sourceEntityId = entityIdByNodeId.get(edge.source);
      const targetEntityId = entityIdByNodeId.get(edge.target);
      if (!sourceEntityId || !targetEntityId || sourceEntityId === targetEntityId) continue;

      const isSwapped = sourceEntityId > targetEntityId;
      const [sourceId, targetId] = isSwapped ? [targetEntityId, sourceEntityId] : [sourceEntityId, targetEntityId];
      const sourceOffset = Number(edge.sourceOffset ?? edge.source_offset) || 0;
      const targetOffset = Number(edge.targetOffset ?? edge.target_offset) || 0;
      const fileId = edge.fileId || fallbackFileId;
      const candidate = {
        fileId,
        sourceEntityId: sourceId,
        targetEntityId: targetId,
        weight: Number(edge.weight) || 1,
        distance: Math.max(1, Number(edge.distance) || 1),
        snippet: String(edge.snippet || ''),
        sourceOffset: isSwapped ? targetOffset : sourceOffset,
        targetOffset: isSwapped ? sourceOffset : targetOffset,
      };
      const key = `${fileId}:${sourceId}:${targetId}`;
      if (!neighborhoods.has(key) || candidate.weight > neighborhoods.get(key).weight) neighborhoods.set(key, candidate);
    }

    for (const neighborhood of neighborhoods.values()) {
      await tx.entityNeighborhood.upsert({
        where: {
          fileId_sourceEntityId_targetEntityId: {
            fileId: neighborhood.fileId,
            sourceEntityId: neighborhood.sourceEntityId,
            targetEntityId: neighborhood.targetEntityId,
          },
        },
        create: neighborhood,
        update: {
          weight: neighborhood.weight,
          distance: neighborhood.distance,
          snippet: neighborhood.snippet,
          sourceOffset: neighborhood.sourceOffset,
          targetOffset: neighborhood.targetOffset,
        },
      });
      neighborhoodCount += 1;
    }
  }, { maxWait: 30000, timeout: 60000 });

  await recomputeSessionTfidf(sessionId);
  await clearSessionGraphCache(sessionId);
  await context.log(`Stored ${occurrenceCount} occurrence snippet set${occurrenceCount === 1 ? '' : 's'} and ${neighborhoodCount} co-occurrence snippet${neighborhoodCount === 1 ? '' : 's'} for the graph page.`);
}

export const kuzuDbWriteHandler: NodeHandler = {
  type: 'output.kuzudb_write',
  async run(inputs, config, context) {
    const input = requireGraphInput(inputs);
    const confirmCommit = config?.confirmCommit || false;
    if (context.isDryRun) {
      await context.log('Dry run: KuzuDB commit skipped. Returning input graph preview.');
      return input;
    }

    if (!confirmCommit) {
      await context.log('[WARNING] Commit to KuzuDB aborted. Node configuration requires explicit "Confirm writing to live graph database" authorization.');
      return input;
    }

    await context.log('Sending graph payload for bulk import transaction in KuzuDB...');
    const fileIds = Array.from(new Set([
      ...input.nodes.flatMap((node) => (node.occurrences || []).map((occ: any) => occ.fileId)),
      ...input.edges.map((edge: any) => edge.fileId),
    ].filter(Boolean))) as string[];
    const fallbackFileId = fileIds[0] || 'pipeline-run';
    const importFileIds = fileIds.length > 0 ? fileIds : [fallbackFileId];
    await ensureSessionFiles(input, importFileIds, context.sessionId, context);
    const nodes = input.nodes.map((node: any) => ({
      id: node.id,
      canonical: node.canonical || node.label || '',
      display_name: node.label || node.displayName || '',
      type: node.type,
      metadata: typeof node.metadata === 'string' ? node.metadata : JSON.stringify(node.metadata || {}),
      occurrences: (node.occurrences || []).map((occ: any) => ({ file_id: occ.fileId, count: occ.count || 1, excerpts: typeof occ.excerpts === 'string' ? occ.excerpts : JSON.stringify(occ.excerpts || []) })),
    }));
    const edges = input.edges.map((edge: any) => ({
      source: edge.source,
      target: edge.target,
      weight: edge.weight || 1.0,
      distance: edge.distance || 1,
      snippet: edge.snippet || '',
      source_offset: edge.sourceOffset || 0,
      target_offset: edge.targetOffset || 0,
      file_id: edge.fileId || fallbackFileId,
    }));

    const res = await fetch(`${NLP_URL}/graph/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_ids: importFileIds, nodes, edges }),
    });

    if (!res.ok) throw new Error(`KuzuDB Write failed: status ${res.status} | ${await res.text()}`);
    const result = await res.json();
    await persistGraphToPrisma(input, fallbackFileId, context.sessionId, context);
    await context.log(`KuzuDB Write Success: committed ${result.nodes_imported} nodes and ${result.edges_imported} edges.`);
    return input;
  },
};
