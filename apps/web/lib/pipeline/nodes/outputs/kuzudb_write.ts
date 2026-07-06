import { NodeHandler } from '../../executor';
import { NLP_URL } from '@/lib/nlp-url';
import { requireGraphInput } from '../shared';
import { prisma } from '@/lib/prisma';
import { SESSION_TTL_MS } from '@/lib/api/upload';
import { clearSessionGraphCache } from '@/lib/redis';

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
    if (context.sessionId) await clearSessionGraphCache(context.sessionId);
    await context.log(`KuzuDB Write Success: committed ${result.nodes_imported} nodes and ${result.edges_imported} edges.`);
    return input;
  },
};
