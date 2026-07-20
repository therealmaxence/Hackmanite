import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { NLP_URL } from '@/lib/nlp-url';

const occurrenceInclude = (sessionId: string | null) => ({
  occurrences: {
    include: { file: true },
    where: sessionId ? { file: { sessionId } } : undefined,
    orderBy: { count: 'desc' as const },
  },
});

export async function resolveEntity(id: string, sessionId: string | null) {
  return (
    (await prisma.entity.findUnique({ where: { id }, include: occurrenceInclude(sessionId) })) ||
    (await resolveEntityViaKuzu(id, sessionId))
  );
}

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
  if (await prisma.entity.findUnique({ where: { id }, select: { id: true } })) return id;
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

type Neighborhood = Prisma.EntityNeighborhoodGetPayload<{
  include: { file: true; sourceEntity: true; targetEntity: true };
}>;
type OccurrenceWithFile = {
  fileId: string;
  count: number;
  tfidf: number;
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
  tfidf?: number;
  snippets: {
    text: string;
    offset: number;
    relatedEntityId: string;
    relatedEntityName: string;
    relatedEntityType: string;
    weight: number;
  }[];
}

const makeFileEntry = (fileId: string, file: OccurrenceWithFile['file']): FileEntry => ({
  fileId,
  fileName: file.originalName,
  mimeType: file.mimeType,
  sizeBytes: Number(file.sizeBytes),
  uploadedAt: file.uploadedAt.toISOString(),
  processedAt: file.processedAt?.toISOString() || null,
  count: 0,
  snippets: [],
});

export function buildEntityFiles(
  entity: { id: string; displayName: string; type: string; occurrences: OccurrenceWithFile[] },
  neighborhoods: Neighborhood[]
) {
  const filesMap = new Map<string, FileEntry>();

  for (const occ of entity.occurrences) {
    const entry = filesMap.get(occ.fileId) || makeFileEntry(occ.fileId, occ.file);
    entry.count += occ.count;
    entry.tfidf = occ.tfidf;

    const excerpts = typeof occ.excerpts === 'string'
      ? JSON.parse(occ.excerpts)
      : (occ.excerpts as any[]) ?? [];

    for (const ex of excerpts) {
      const text = typeof ex === 'string' ? ex : ex?.text;
      if (text) {
        entry.snippets.push({
          text,
          offset: typeof ex === 'object' && typeof ex?.offset === 'number' ? ex.offset : 0,
          relatedEntityId: entity.id,
          relatedEntityName: entity.displayName,
          relatedEntityType: entity.type,
          weight: 1.0,
        });
      }
    }
    filesMap.set(occ.fileId, entry);
  }

  for (const nb of neighborhoods) {
    const isSource = nb.sourceEntityId === entity.id;
    const related = isSource ? nb.targetEntity : nb.sourceEntity;
    const entry = filesMap.get(nb.fileId) || makeFileEntry(nb.fileId, nb.file as any);
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

export function buildCoOccurring(entity: { id: string }, neighborhoods: Neighborhood[]) {
  const map = new Map<string, { id: string; displayName: string; type: string; weight: number }>();
  for (const nb of neighborhoods) {
    const related = nb.sourceEntityId === entity.id ? nb.targetEntity : nb.sourceEntity;
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

export { syncSessionToKuzu } from './sync';
