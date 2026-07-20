import { prisma } from '@/lib/prisma';
import { EntityType } from '@/types/entities';

const BATCH_SIZE = 100;

export interface SessionGraphExport {
  sessionId: string;
  exportedAt: string;
  windowSize: number;
  minConnections: number;
  minOccurrences: number;
  minEdgeWeight: number;
  minTfidf: number;
  hiddenNodeIds: string[];
  nodes: Array<{
    id: string;
    label: string;
    type: EntityType;
    canonical: string;
    metadata: string | null;
    occurrences: any[];
  }>;
  edges: Array<{
    source: string;
    target: string;
    weight: number;
    distance: number;
    snippet: string;
    sourceOffset: number;
    targetOffset: number;
    fileId: string;
    fileName: string;
  }>;
  emails: Array<{
    id: string;
    messageId: string;
    inReplyTo: string | null;
    references: string | null;
    subject: string;
    from: string;
    to: string;
    cc: string | null;
    date: string | null;
    body: string;
    attachments: string | null;
    fileId: string | null;
    fileName: string | null;
    fileMimeType: string | null;
    fileSizeBytes: number | null;
    fileOriginalCreatedAt: string | null;
  }>;
}

export async function buildSessionGraphExport(sessionId: string): Promise<SessionGraphExport> {
  const [files, sessionRecord] = await Promise.all([
    prisma.file.findMany({
      where: { sessionId },
      select: { id: true, originalName: true, mimeType: true, sizeBytes: true, originalCreatedAt: true },
    }),
    prisma.session.findUnique({
      where: { id: sessionId },
      select: { windowSize: true, minConnections: true, minOccurrences: true, minEdgeWeight: true, minTfidf: true, hiddenNodeIds: true },
    }),
  ]);

  const windowSize = sessionRecord?.windowSize ?? 400;
  const minConnections = sessionRecord?.minConnections ?? 2;
  const minOccurrences = sessionRecord?.minOccurrences ?? 2;
  const minEdgeWeight = sessionRecord?.minEdgeWeight ?? 0.0;
  const minTfidf = sessionRecord?.minTfidf ?? 0.0;
  const baseResponse = { sessionId, exportedAt: new Date().toISOString(), windowSize, minConnections, minOccurrences, minEdgeWeight, minTfidf };

  if (files.length === 0) {
    return { ...baseResponse, hiddenNodeIds: [], nodes: [], edges: [], emails: [] };
  }

  const filesMap = new Map(files.map((file) => [file.id, file]));
  const fileIds = files.map((file) => file.id);
  const entityOccurrencesMap = new Map<string, { entity: any; occurrences: any[] }>();

  for (let index = 0; index < fileIds.length; index += BATCH_SIZE) {
    const occurrences = await prisma.occurrence.findMany({
      where: { fileId: { in: fileIds.slice(index, index + BATCH_SIZE) } },
      include: { entity: true },
    });
    for (const occ of occurrences) {
      const file = filesMap.get(occ.fileId);
      if (!occ.entity || !file) continue;
      const current = entityOccurrencesMap.get(occ.entity.id) ?? { entity: occ.entity, occurrences: [] };
      current.occurrences.push({
        fileId: file.id,
        fileName: file.originalName,
        mimeType: file.mimeType,
        sizeBytes: Number(file.sizeBytes),
        count: occ.count,
        tfidf: occ.tfidf,
        excerpts: occ.excerpts,
        originalCreatedAt: file.originalCreatedAt?.toISOString() ?? null,
      });
      entityOccurrencesMap.set(occ.entity.id, current);
    }
  }

  const nodes = Array.from(entityOccurrencesMap.entries()).map(([entityId, value]) => ({
    id: entityId,
    label: value.entity.displayName,
    type: value.entity.type as EntityType,
    canonical: value.entity.canonical,
    metadata: value.entity.metadata,
    occurrences: value.occurrences,
  }));

  const edges: any[] = [];
  for (let index = 0; index < fileIds.length; index += BATCH_SIZE) {
    const neighborhoods = await prisma.entityNeighborhood.findMany({
      where: { fileId: { in: fileIds.slice(index, index + BATCH_SIZE) } },
      include: { file: { select: { originalName: true } } },
    });
    for (const neighborhood of neighborhoods) {
      edges.push({
        source: neighborhood.sourceEntityId,
        target: neighborhood.targetEntityId,
        weight: neighborhood.weight,
        distance: neighborhood.distance,
        snippet: neighborhood.snippet,
        sourceOffset: neighborhood.sourceOffset,
        targetOffset: neighborhood.targetOffset,
        fileId: neighborhood.fileId,
        fileName: neighborhood.file.originalName,
      });
    }
  }

  const emails = await prisma.email.findMany({
    where: { fileId: { in: fileIds } },
    include: { file: { select: { originalName: true, mimeType: true, sizeBytes: true, originalCreatedAt: true } } },
  });

  return {
    ...baseResponse,
    hiddenNodeIds: JSON.parse(sessionRecord?.hiddenNodeIds || '[]'),
    nodes,
    edges,
    emails: emails.map((email) => ({
      id: email.id,
      messageId: email.messageId,
      inReplyTo: email.inReplyTo,
      references: email.references,
      subject: email.subject,
      from: email.from,
      to: email.to,
      cc: email.cc,
      date: email.date?.toISOString() ?? null,
      body: email.body,
      attachments: email.attachments,
      fileId: email.fileId,
      fileName: email.file?.originalName ?? null,
      fileMimeType: email.file?.mimeType ?? null,
      fileSizeBytes: email.file ? Number(email.file.sizeBytes) : null,
      fileOriginalCreatedAt: email.file?.originalCreatedAt?.toISOString() ?? null,
    })),
  };
}
