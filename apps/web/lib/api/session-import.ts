import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

function serializeToString(val: any): string | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export interface ImportInput {
  sessionId?: string;
  nodes: any[];
  edges: any[];
  windowSize?: number;
  minConnections?: number;
  minOccurrences?: number;
  minEdgeWeight?: number;
  emails?: any[];
}

export async function importSessionData(body: ImportInput) {
  const {
    sessionId,
    nodes,
    edges,
    windowSize: customWindowSize,
    minConnections: customMinConnections,
    minOccurrences: customMinOccurrences,
    minEdgeWeight: customMinEdgeWeight,
    emails,
  } = body;

  const filesMap = new Map<string, { fileName: string; mimeType: string; sizeBytes: number; originalCreatedAt: string | null }>();

  for (const node of nodes) {
    if (Array.isArray(node.occurrences)) {
      for (const occ of node.occurrences) {
        if (occ.fileId) {
          filesMap.set(occ.fileId, {
            fileName: occ.fileName || 'unknown.txt',
            mimeType: occ.mimeType || 'text/plain',
            sizeBytes: typeof occ.sizeBytes === 'number' ? occ.sizeBytes : 0,
            originalCreatedAt: occ.originalCreatedAt || null,
          });
        }
      }
    }
  }

  for (const edge of edges) {
    if (edge.fileId && !filesMap.has(edge.fileId)) {
      filesMap.set(edge.fileId, {
        fileName: edge.fileName || 'unknown.txt',
        mimeType: 'text/plain',
        sizeBytes: 0,
        originalCreatedAt: null,
      });
    }
  }

  if (Array.isArray(emails)) {
    for (const email of emails) {
      if (email.fileId && !filesMap.has(email.fileId)) {
        filesMap.set(email.fileId, {
          fileName: email.fileName || 'unknown_email.eml',
          mimeType: email.fileMimeType || 'message/rfc822',
          sizeBytes: typeof email.fileSizeBytes === 'number' ? email.fileSizeBytes : 0,
          originalCreatedAt: email.fileOriginalCreatedAt || email.date || null,
        });
      }
    }
  }

  const entitiesToProcess = new Map<string, { oldId: string; canonical: string; displayName: string; type: string; metadata: any }>();

  for (const node of nodes) {
    if (node.canonical && node.type) {
      const key = `${node.canonical}:${node.type}`;
      if (!entitiesToProcess.has(key)) {
        entitiesToProcess.set(key, {
          oldId: node.id,
          canonical: node.canonical,
          displayName: node.label || node.canonical,
          type: node.type,
          metadata: node.metadata || null,
        });
      }
    }
  }

  const fileIdMap = new Map<string, string>();
  const entityIdMap = new Map<string, string>();

  return prisma.$transaction(async (tx) => {
    let sessionRecord = null;
    if (sessionId) {
      sessionRecord = await tx.session.findUnique({ where: { id: sessionId } });
    }

    if (!sessionRecord) {
      sessionRecord = await tx.session.create({
        data: {
          id: sessionId || undefined,
          expiresAt: new Date(Date.now() + SESSION_TTL_MS),
          windowSize: typeof customWindowSize === 'number' ? customWindowSize : undefined,
          minConnections: typeof customMinConnections === 'number' ? customMinConnections : undefined,
          minOccurrences: typeof customMinOccurrences === 'number' ? customMinOccurrences : undefined,
          minEdgeWeight: typeof customMinEdgeWeight === 'number' ? customMinEdgeWeight : undefined,
        },
      });
    } else {
      sessionRecord = await tx.session.update({
        where: { id: sessionId },
        data: {
          expiresAt: new Date(Date.now() + SESSION_TTL_MS),
          windowSize: typeof customWindowSize === 'number' ? customWindowSize : undefined,
          minConnections: typeof customMinConnections === 'number' ? customMinConnections : undefined,
          minOccurrences: typeof customMinOccurrences === 'number' ? customMinOccurrences : undefined,
          minEdgeWeight: typeof customMinEdgeWeight === 'number' ? customMinEdgeWeight : undefined,
        },
      });
    }

    const filesDataToCreate = [];
    for (const [oldFileId, fileInfo] of filesMap.entries()) {
      const newFileId = randomUUID();
      fileIdMap.set(oldFileId, newFileId);

      filesDataToCreate.push({
        id: newFileId,
        sessionId: sessionRecord.id,
        originalName: fileInfo.fileName,
        storagePath: `imported/${sessionRecord.id}/${oldFileId}-${randomUUID()}`,
        mimeType: fileInfo.mimeType,
        sizeBytes: BigInt(fileInfo.sizeBytes),
        status: 'DONE' as const,
        originalCreatedAt: fileInfo.originalCreatedAt ? new Date(fileInfo.originalCreatedAt) : new Date(),
        processedAt: new Date(),
        uploadedAt: new Date(),
      });
    }

    if (filesDataToCreate.length > 0) {
      for (const chunk of chunkArray(filesDataToCreate, 80)) {
        await tx.file.createMany({ data: chunk });
      }
    }

    const canonicalNames = Array.from(entitiesToProcess.values()).map((e) => e.canonical);
    const existingEntities = await tx.entity.findMany({
      where: { canonical: { in: canonicalNames } },
      select: { id: true, canonical: true, type: true },
    });

    const existingEntityMap = new Map<string, string>();
    for (const ent of existingEntities) {
      existingEntityMap.set(`${ent.canonical}:${ent.type}`, ent.id);
    }

    const entitiesToCreate = [];
    for (const [key, ent] of entitiesToProcess.entries()) {
      const existingId = existingEntityMap.get(key);
      if (existingId) {
        entityIdMap.set(ent.oldId, existingId);
      } else {
        const newEntityId = randomUUID();
        entityIdMap.set(ent.oldId, newEntityId);
        entitiesToCreate.push({
          id: newEntityId,
          canonical: ent.canonical,
          displayName: ent.displayName,
          type: ent.type as any,
          metadata: ent.metadata ? serializeToString(ent.metadata) : undefined,
        });
      }
    }

    if (entitiesToCreate.length > 0) {
      for (const chunk of chunkArray(entitiesToCreate, 150)) {
        await tx.entity.createMany({ data: chunk });
      }
    }

    const occurrencesToCreate = [];
    const seenOccurrences = new Set<string>();

    for (const node of nodes) {
      const newEntityId = entityIdMap.get(node.id);
      if (!newEntityId || !Array.isArray(node.occurrences)) continue;

      for (const occ of node.occurrences) {
        const newFileId = fileIdMap.get(occ.fileId);
        if (!newFileId) continue;

        const occKey = `${newFileId}:${newEntityId}`;
        if (seenOccurrences.has(occKey)) continue;
        seenOccurrences.add(occKey);

        occurrencesToCreate.push({
          id: randomUUID(),
          entityId: newEntityId,
          fileId: newFileId,
          count: occ.count || 1,
          excerpts: occ.excerpts ? serializeToString(occ.excerpts) : null,
        });
      }
    }

    if (occurrencesToCreate.length > 0) {
      for (const chunk of chunkArray(occurrencesToCreate, 150)) {
        await tx.occurrence.createMany({ data: chunk });
      }
    }

    const neighborhoodsToCreate = [];
    const seenNeighborhoods = new Set<string>();

    for (const edge of edges) {
      const newSource = entityIdMap.get(edge.source);
      const newTarget = entityIdMap.get(edge.target);
      const newFileId = fileIdMap.get(edge.fileId);

      if (!newSource || !newTarget || !newFileId) continue;

      const [sourceEntityId, targetEntityId] = newSource < newTarget ? [newSource, newTarget] : [newTarget, newSource];
      const isSwapped = newSource > newTarget;

      const nbKey = `${newFileId}:${sourceEntityId}:${targetEntityId}`;
      if (seenNeighborhoods.has(nbKey)) continue;
      seenNeighborhoods.add(nbKey);

      neighborhoodsToCreate.push({
        id: randomUUID(),
        fileId: newFileId,
        sourceEntityId,
        targetEntityId,
        weight: typeof edge.weight === 'number' ? edge.weight : 1.0,
        distance: typeof edge.distance === 'number' ? edge.distance : 0,
        snippet: edge.snippet || '',
        sourceOffset: isSwapped ? (edge.targetOffset ?? 0) : (edge.sourceOffset ?? 0),
        targetOffset: isSwapped ? (edge.sourceOffset ?? 0) : (edge.targetOffset ?? 0),
      });
    }

    if (neighborhoodsToCreate.length > 0) {
      for (const chunk of chunkArray(neighborhoodsToCreate, 100)) {
        await tx.entityNeighborhood.createMany({ data: chunk });
      }
    }

    const emailsToCreate = [];
    if (Array.isArray(emails)) {
      for (const email of emails) {
        const newFileId = email.fileId ? fileIdMap.get(email.fileId) : null;
        emailsToCreate.push({
          id: email.id || randomUUID(),
          fileId: newFileId || null,
          messageId: email.messageId,
          inReplyTo: email.inReplyTo || null,
          references: email.references || null,
          subject: email.subject || '',
          from: email.from || '',
          to: email.to || '',
          cc: email.cc || null,
          date: email.date ? new Date(email.date) : null,
          body: email.body || '',
          attachments: email.attachments ? serializeToString(email.attachments) : null,
        });
      }
    }

    if (emailsToCreate.length > 0) {
      const messageIds = emailsToCreate.map((e) => e.messageId);
      await tx.email.deleteMany({
        where: { messageId: { in: messageIds } },
      });

      for (const chunk of chunkArray(emailsToCreate, 70)) {
        await tx.email.createMany({ data: chunk });
      }
    }

    return {
      session: sessionRecord,
      filesCreated: filesDataToCreate,
      occurrencesCreated: occurrencesToCreate,
      emailsRestoredCount: emailsToCreate.length,
    };
  }, {
    timeout: 1800000,
  });
}
