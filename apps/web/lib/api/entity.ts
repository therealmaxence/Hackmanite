import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

const NLP_URL = process.env.NLP_SERVICE_URL || 'http://localhost:8000';

// Include shape reused in both GET and fallback queries
const occurrenceInclude = (sessionId: string | null) => ({
  occurrences: {
    include: { file: true },
    where: sessionId ? { file: { sessionId } } : undefined,
    orderBy: { count: 'desc' as const },
  },
});

// Tries to find entity by Prisma ID; if not found, resolves via KuzuDB UUID5 fallback
export async function resolveEntity(id: string, sessionId: string | null) {
  let entity = await prisma.entity.findUnique({
    where: { id },
    include: occurrenceInclude(sessionId),
  });

  if (!entity) {
    entity = await resolveEntityViaKuzu(id, sessionId);
  }
  return entity;
}

// Resolve entity by querying KuzuDB for canonical/type, then look it up in Prisma
async function resolveEntityViaKuzu(id: string, sessionId: string | null) {
  try {
    const res = await fetch(`${NLP_URL}/graph/node/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const kuzuNode = await res.json();
    return prisma.entity.findUnique({
      where: { canonical_type: { canonical: kuzuNode.canonical, type: kuzuNode.type } },
      include: occurrenceInclude(sessionId),
    });
  } catch (err) {
    console.error('Failed to resolve UUID5 KuzuDB node fallback:', err);
    return null;
  }
}

export async function resolveEntityId(id: string): Promise<string> {
  const exists = await prisma.entity.findUnique({ where: { id }, select: { id: true } });
  if (exists) return id;

  try {
    const res = await fetch(`${NLP_URL}/graph/node/${id}`, { cache: 'no-store' });
    if (!res.ok) return id;
    const kuzuNode = await res.json();
    const dbEntity = await prisma.entity.findUnique({
      where: { canonical_type: { canonical: kuzuNode.canonical, type: kuzuNode.type } },
      select: { id: true },
    });
    if (dbEntity) return dbEntity.id;
  } catch (err) {
    console.error('Failed to resolve UUID5 in DELETE handler:', err);
  }
  return id;
}

// ─── Response builders ─────────────────────────────────────────────────────────

type Neighborhood = Prisma.EntityNeighborhoodGetPayload<{
  include: { file: true; sourceEntity: true; targetEntity: true };
}>;
type OccurrenceWithFile = {
  fileId: string;
  count: number;
  excerpts: unknown;
  file: {
    originalName: string;
    mimeType: string;
    sizeBytes: bigint;
    uploadedAt: Date;
    processedAt: Date | null;
  };
};

interface FileEntry {
  fileId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  processedAt: string | null;
  count: number;
  snippets: {
    text: string;
    offset: number;
    relatedEntityId: string;
    relatedEntityName: string;
    relatedEntityType: string;
    weight: number;
  }[];
}

function makeFileEntry(
  fileId: string,
  file: OccurrenceWithFile['file']
): FileEntry {
  return {
    fileId,
    fileName: file.originalName,
    mimeType: file.mimeType,
    sizeBytes: Number(file.sizeBytes),
    uploadedAt: file.uploadedAt.toISOString(),
    processedAt: file.processedAt ? file.processedAt.toISOString() : null,
    count: 0,
    snippets: [],
  };
}

export function buildEntityFiles(
  entity: { id: string; displayName: string; type: string; occurrences: OccurrenceWithFile[] },
  neighborhoods: Neighborhood[]
) {
  const filesMap = new Map<string, FileEntry>();

  for (const occ of entity.occurrences) {
    const entry = filesMap.get(occ.fileId) ?? makeFileEntry(occ.fileId, occ.file);
    entry.count += occ.count;

    const excerpts: unknown[] =
      typeof occ.excerpts === 'string'
        ? JSON.parse(occ.excerpts)
        : (occ.excerpts as unknown[]) ?? [];

    for (const ex of excerpts) {
      let text = '';
      let offset = 0;
      if (typeof ex === 'string') {
        text = ex;
      } else if (ex && typeof (ex as { text?: unknown }).text === 'string') {
        text = (ex as { text: string }).text;
        offset = typeof (ex as { offset?: unknown }).offset === 'number' ? (ex as { offset: number }).offset : 0;
      }
      if (!text) continue;
      entry.snippets.push({
        text,
        offset,
        relatedEntityId: entity.id,
        relatedEntityName: entity.displayName,
        relatedEntityType: entity.type,
        weight: 1.0,
      });
    }
    filesMap.set(occ.fileId, entry);
  }

  for (const nb of neighborhoods) {
    const isSource = nb.sourceEntityId === entity.id;
    const related = isSource ? nb.targetEntity : nb.sourceEntity;
    const entry = filesMap.get(nb.fileId) ?? makeFileEntry(nb.fileId, nb.file as unknown as OccurrenceWithFile['file']);
    entry.count += 1;
    entry.snippets.push({
      text: nb.snippet,
      offset: isSource ? nb.sourceOffset : nb.targetOffset,
      relatedEntityId: related.id,
      relatedEntityName: related.displayName,
      relatedEntityType: related.type,
      weight: nb.weight,
    });
    filesMap.set(nb.fileId, entry);
  }

  return Array.from(filesMap.values());
}

export function buildCoOccurring(
  entity: { id: string },
  neighborhoods: Neighborhood[]
) {
  const map = new Map<string, { id: string; displayName: string; type: string; weight: number }>();
  for (const nb of neighborhoods) {
    const isSource = nb.sourceEntityId === entity.id;
    const related = isSource ? nb.targetEntity : nb.sourceEntity;
    const current = map.get(related.id);
    if (!current || nb.weight > current.weight) {
      map.set(related.id, {
        id: related.id,
        displayName: related.displayName,
        type: related.type,
        weight: nb.weight,
      });
    }
  }
  return Array.from(map.values());
}

// Fetch neighborhoods for a given entity scoped to a session
export async function fetchNeighborhoods(entityId: string, sessionId: string) {
  return prisma.entityNeighborhood.findMany({
    where: {
      file: { sessionId },
      OR: [{ sourceEntityId: entityId }, { targetEntityId: entityId }],
    },
    include: { file: true, sourceEntity: true, targetEntity: true },
    orderBy: { weight: 'desc' },
  });
}

const activeSyncs = new Map<string, Promise<void>>();

/**
 * Synchronizes SQLite (Prisma) session entities, occurrences, and relationships
 * into KuzuDB by posting them to the Python NLP service bulk import endpoint.
 * This enables fully self-healing dynamic sync for imported sessions.
 */
export async function syncSessionToKuzu(sessionId: string) {
  const existing = activeSyncs.get(sessionId);
  if (existing) {
    console.log(`[Sync] Lock hit: sync already running for session ${sessionId}. Reusing promise.`);
    return existing;
  }

  const promise = (async () => {
    const files = await prisma.file.findMany({
      where: { sessionId, status: 'DONE' },
      select: { id: true },
    });

    if (files.length === 0) return;

  const fileIds = files.map((f) => f.id);

  // 1. Query occurrences directly with entity details in a single flat query (avoiding nested file records)
  const occurrences = await prisma.occurrence.findMany({
    where: { fileId: { in: fileIds } },
    include: { entity: true },
  });

  // Group occurrences by entity
  const entityOccurrencesMap = new Map<
    string,
    {
      entity: any;
      occurrences: Array<{
        file_id: string;
        count: number;
        excerpts: string | null;
      }>;
    }
  >();

  for (const occ of occurrences) {
    const entity = occ.entity;
    if (!entity) continue;
    const cur = entityOccurrencesMap.get(entity.id) ?? {
      entity,
      occurrences: [],
    };
    cur.occurrences.push({
      file_id: occ.fileId,
      count: occ.count,
      excerpts: occ.excerpts,
    });
    entityOccurrencesMap.set(entity.id, cur);
  }

  const nodes = Array.from(entityOccurrencesMap.entries()).map(([entityId, val]) => ({
    id: entityId,
    canonical: val.entity.canonical,
    display_name: val.entity.displayName,
    type: val.entity.type,
    metadata: val.entity.metadata,
    occurrences: val.occurrences,
  }));

  // 2. Query neighborhoods selecting only required fields to bypass Prisma heavy model instantiation
  const neighborhoods = await prisma.entityNeighborhood.findMany({
    where: { fileId: { in: fileIds } },
    select: {
      sourceEntityId: true,
      targetEntityId: true,
      weight: true,
      distance: true,
      snippet: true,
      sourceOffset: true,
      targetOffset: true,
      fileId: true,
    },
  });

  const edges = neighborhoods.map((n) => ({
    source: n.sourceEntityId,
    target: n.targetEntityId,
    weight: n.weight,
    distance: n.distance,
    snippet: n.snippet,
    source_offset: n.sourceOffset,
    target_offset: n.targetOffset,
    file_id: n.fileId,
  }));

  console.log(
    `[Sync] Initializing KuzuDB transaction sync for session ${sessionId}: files=${fileIds.length}, nodes=${nodes.length}, edges=${edges.length}`
  );

  // 3. Register file references in a single quick call
  let upstream = await fetch(`${NLP_URL}/graph/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      file_ids: fileIds,
      nodes: [],
      edges: [],
    }),
  });

  if (!upstream.ok) {
    const text = await upstream.text();
    throw new Error(`Failed to sync file references to KuzuDB: ${upstream.status} - ${text}`);
  }

  // 4. Batch nodes in groups of 4,000 to keep payload size small and prevent memory bloat
  const NODE_BATCH_SIZE = 4000;
  for (let i = 0; i < nodes.length; i += NODE_BATCH_SIZE) {
    const batchNodes = nodes.slice(i, i + NODE_BATCH_SIZE);
    upstream = await fetch(`${NLP_URL}/graph/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_ids: [],
        nodes: batchNodes,
        edges: [],
      }),
    });
    if (!upstream.ok) {
      const text = await upstream.text();
      throw new Error(`Failed to sync node batch (${i}-${i + NODE_BATCH_SIZE}) to KuzuDB: ${upstream.status} - ${text}`);
    }
  }

  // 5. Batch edges in groups of 30,000 to keep JSON payloads lightweight and fast to process
  const EDGE_BATCH_SIZE = 30000;
  for (let i = 0; i < edges.length; i += EDGE_BATCH_SIZE) {
    const batchEdges = edges.slice(i, i + EDGE_BATCH_SIZE);
    upstream = await fetch(`${NLP_URL}/graph/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_ids: [],
        nodes: [],
        edges: batchEdges,
      }),
    });
    if (!upstream.ok) {
      const text = await upstream.text();
      throw new Error(`Failed to sync edge batch (${i}-${i + EDGE_BATCH_SIZE}) to KuzuDB: ${upstream.status} - ${text}`);
    }
  }

    console.log(`[Sync] KuzuDB transaction sync completed successfully for session ${sessionId}`);
  })();

  activeSyncs.set(sessionId, promise);
  try {
    await promise;
  } finally {
    activeSyncs.delete(sessionId);
  }
}
