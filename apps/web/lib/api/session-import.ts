import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

const serializeToString = (val: any): string | null => {
  if (val == null) return null;
  return typeof val === 'object' ? JSON.stringify(val) : String(val);
};

const chunkArray = <T>(arr: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, (i + 1) * size));

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

function extractFilesMap(nodes: any[], edges: any[], emails?: any[]) {
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
      filesMap.set(edge.fileId, { fileName: edge.fileName || 'unknown.txt', mimeType: 'text/plain', sizeBytes: 0, originalCreatedAt: null });
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

  return filesMap;
}

const CODE_KEYWORDS = new Set(['let', 'const', 'var', 'function', 'import', 'class', 'return', 'null', 'undefined', 'true', 'false']);

function isValidEntity(text: string, type: string): boolean {
  if (type !== 'PERSON' && type !== 'ORGANIZATION') return true;
  if (text.length < 2) return false;
  if (/[=+(){}[\]/\\;<>*!|%?^$@#"]/.test(text)) return false;
  if (text.includes('.') && /\.[a-zA-Z]/.test(text)) return false;
  if (/^\d|\d$/.test(text)) return false;
  if (/[a-z]+[A-Z]/.test(text) && !/^(mc|mac)[A-Z]/i.test(text)) return false;
  if (text.toLowerCase().split(/\s+/).some((w) => CODE_KEYWORDS.has(w))) return false;
  return true;
}

function extractEntities(nodes: any[]) {
  const entities = new Map<string, { oldId: string; canonical: string; displayName: string; type: string; metadata: any }>();
  for (const node of nodes) {
    if (node.canonical && node.type && isValidEntity(node.canonical, node.type)) {
      const key = `${node.canonical}:${node.type}`;
      if (!entities.has(key)) {
        entities.set(key, {
          oldId: node.id,
          canonical: node.canonical,
          displayName: node.label || node.canonical,
          type: node.type,
          metadata: node.metadata || null,
        });
      }
    }
  }
  return entities;
}

async function createOrUpdateSession(tx: any, sessionId: string | undefined, body: ImportInput) {
  const data = {
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    windowSize: typeof body.windowSize === 'number' ? body.windowSize : undefined,
    minConnections: typeof body.minConnections === 'number' ? body.minConnections : undefined,
    minOccurrences: typeof body.minOccurrences === 'number' ? body.minOccurrences : undefined,
    minEdgeWeight: typeof body.minEdgeWeight === 'number' ? body.minEdgeWeight : undefined,
  };

  if (sessionId && await tx.session.findUnique({ where: { id: sessionId } })) {
    return tx.session.update({ where: { id: sessionId }, data });
  }
  return tx.session.create({ data: { id: sessionId || undefined, ...data } });
}

async function insertFiles(tx: any, filesMap: Map<string, any>, sessionId: string, fileIdMap: Map<string, string>) {
  const filesData = Array.from(filesMap.entries()).map(([oldFileId, fileInfo]) => {
    const newFileId = randomUUID();
    fileIdMap.set(oldFileId, newFileId);
    return {
      id: newFileId,
      sessionId,
      originalName: fileInfo.fileName,
      storagePath: `imported/${sessionId}/${oldFileId}-${randomUUID()}`,
      mimeType: fileInfo.mimeType,
      sizeBytes: BigInt(fileInfo.sizeBytes),
      status: 'DONE' as const,
      originalCreatedAt: fileInfo.originalCreatedAt ? new Date(fileInfo.originalCreatedAt) : new Date(),
      processedAt: new Date(),
      uploadedAt: new Date(),
    };
  });

  for (const chunk of chunkArray(filesData, 80)) {
    await tx.file.createMany({ data: chunk });
  }
  return filesData;
}

async function insertEntities(tx: any, entitiesMap: Map<string, any>, entityIdMap: Map<string, string>) {
  const canonicalNames = Array.from(entitiesMap.values()).map((e) => e.canonical);
  const existing = await tx.entity.findMany({
    where: { canonical: { in: canonicalNames } },
    select: { id: true, canonical: true, type: true },
  });

  const existingMap = new Map<string, string>(existing.map((e: any) => [`${e.canonical}:${e.type}`, e.id]));

  const toCreate: any[] = [];
  for (const [key, ent] of entitiesMap.entries()) {
    const existingId = existingMap.get(key);
    if (existingId) {
      entityIdMap.set(ent.oldId, existingId);
    } else {
      const newId = randomUUID();
      entityIdMap.set(ent.oldId, newId);
      toCreate.push({
        id: newId,
        canonical: ent.canonical,
        displayName: ent.displayName,
        type: ent.type as any,
        metadata: ent.metadata ? serializeToString(ent.metadata) : undefined,
      });
    }
  }

  for (const chunk of chunkArray(toCreate, 150)) {
    await tx.entity.createMany({ data: chunk });
  }
}

async function insertOccurrences(tx: any, nodes: any[], fileIdMap: Map<string, string>, entityIdMap: Map<string, string>) {
  const toCreate: any[] = [];
  const seen = new Set<string>();

  for (const node of nodes) {
    const newEntityId = entityIdMap.get(node.id);
    if (!newEntityId || !Array.isArray(node.occurrences)) continue;
    for (const occ of node.occurrences) {
      const newFileId = fileIdMap.get(occ.fileId);
      if (!newFileId) continue;
      const key = `${newFileId}:${newEntityId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      toCreate.push({
        id: randomUUID(),
        entityId: newEntityId,
        fileId: newFileId,
        count: occ.count || 1,
        excerpts: occ.excerpts ? serializeToString(occ.excerpts) : null,
      });
    }
  }

  for (const chunk of chunkArray(toCreate, 150)) {
    await tx.occurrence.createMany({ data: chunk });
  }
  return toCreate;
}

async function insertNeighborhoods(tx: any, edges: any[], fileIdMap: Map<string, string>, entityIdMap: Map<string, string>) {
  const toCreate: any[] = [];
  const seen = new Set<string>();

  for (const edge of edges) {
    const newSource = entityIdMap.get(edge.source);
    const newTarget = entityIdMap.get(edge.target);
    const newFileId = fileIdMap.get(edge.fileId);
    if (!newSource || !newTarget || !newFileId) continue;

    const [sourceEntityId, targetEntityId] = newSource < newTarget ? [newSource, newTarget] : [newTarget, newSource];
    const isSwapped = newSource > newTarget;
    const key = `${newFileId}:${sourceEntityId}:${targetEntityId}`;
    if (seen.has(key)) continue;
    seen.add(key);

    toCreate.push({
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

  for (const chunk of chunkArray(toCreate, 100)) {
    await tx.entityNeighborhood.createMany({ data: chunk });
  }
}

async function insertEmails(tx: any, emails: any[] | undefined, fileIdMap: Map<string, string>) {
  if (!Array.isArray(emails) || emails.length === 0) return 0;

  const toCreate = emails.map((email) => ({
    id: email.id || randomUUID(),
    fileId: email.fileId ? fileIdMap.get(email.fileId) || null : null,
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
  }));

  await tx.email.deleteMany({ where: { messageId: { in: toCreate.map((e) => e.messageId) } } });
  for (const chunk of chunkArray(toCreate, 70)) {
    await tx.email.createMany({ data: chunk });
  }
  return toCreate.length;
}

export async function importSessionData(body: ImportInput) {
  const filesMap = extractFilesMap(body.nodes, body.edges, body.emails);
  const entitiesMap = extractEntities(body.nodes);
  const fileIdMap = new Map<string, string>();
  const entityIdMap = new Map<string, string>();

  return prisma.$transaction(async (tx) => {
    const session = await createOrUpdateSession(tx, body.sessionId, body);
    const filesCreated = await insertFiles(tx, filesMap, session.id, fileIdMap);
    await insertEntities(tx, entitiesMap, entityIdMap);
    const occurrencesCreated = await insertOccurrences(tx, body.nodes, fileIdMap, entityIdMap);
    await insertNeighborhoods(tx, body.edges, fileIdMap, entityIdMap);
    const emailsRestoredCount = await insertEmails(tx, body.emails, fileIdMap);
    return { session, filesCreated, occurrencesCreated, emailsRestoredCount };
  }, { maxWait: 60000, timeout: 1800000 });
}
