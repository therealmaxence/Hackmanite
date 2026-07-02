import { NodeHandler } from '../executor';
import { prisma } from '@/lib/prisma';

export const handler: NodeHandler = {
  type: 'source.session',
  async run(_, config, context) {
    const sessionId = config?.sessionId;
    if (!sessionId) {
      throw new Error('Missing parameter: sessionId');
    }

    await context.log(`Loading entity graph from session: ${sessionId}`);

    const files = await prisma.file.findMany({
      where: { sessionId },
      select: { id: true, originalName: true, mimeType: true, sizeBytes: true, originalCreatedAt: true },
    });

    if (files.length === 0) {
      await context.log('Session contains no processed files.');
      return { type: 'graph', nodes: [], edges: [], emails: [] };
    }

    const filesMap = new Map(files.map((f) => [f.id, f]));
    const fileIds = files.map((f) => f.id);

    const occurrences = await prisma.occurrence.findMany({
      where: { fileId: { in: fileIds } },
      include: { entity: true },
    });

    const entityOccurrencesMap = new Map<string, { entity: any; occurrences: any[] }>();
    for (const occ of occurrences) {
      const { entity } = occ;
      const file = filesMap.get(occ.fileId);
      if (!entity || !file) continue;

      const cur = entityOccurrencesMap.get(entity.id) ?? { entity, occurrences: [] };
      cur.occurrences.push({
        fileId: file.id,
        fileName: file.originalName,
        mimeType: file.mimeType,
        sizeBytes: Number(file.sizeBytes),
        count: occ.count,
        tfidf: occ.tfidf,
        excerpts: occ.excerpts,
        originalCreatedAt: file.originalCreatedAt?.toISOString() ?? null,
      });
      entityOccurrencesMap.set(entity.id, cur);
    }

    const nodes = Array.from(entityOccurrencesMap.entries()).map(([entityId, val]) => ({
      id: entityId,
      label: val.entity.displayName,
      type: val.entity.type,
      canonical: val.entity.canonical,
      metadata: val.entity.metadata,
      occurrences: val.occurrences,
    }));

    const neighborhoods = await prisma.entityNeighborhood.findMany({
      where: { fileId: { in: fileIds } },
      include: { file: { select: { originalName: true } } },
    });

    const edges = neighborhoods.map((n) => ({
      source: n.sourceEntityId,
      target: n.targetEntityId,
      weight: n.weight,
      distance: n.distance,
      snippet: n.snippet,
      sourceOffset: n.sourceOffset,
      targetOffset: n.targetOffset,
      fileId: n.fileId,
      fileName: n.file.originalName,
    }));

    const emails = await prisma.email.findMany({
      where: { fileId: { in: fileIds } },
      include: { file: { select: { originalName: true, mimeType: true, sizeBytes: true, originalCreatedAt: true } } },
    });

    await context.log(`Loaded session graph: ${nodes.length} nodes, ${edges.length} edges, ${emails.length} emails.`);

    return {
      type: 'graph',
      nodes,
      edges,
      emails: emails.map((e) => ({
        id: e.id,
        messageId: e.messageId,
        inReplyTo: e.inReplyTo,
        references: e.references,
        subject: e.subject,
        from: e.from,
        to: e.to,
        cc: e.cc,
        date: e.date?.toISOString() ?? null,
        body: e.body,
        attachments: e.attachments,
        fileId: e.fileId,
        fileName: e.file?.originalName ?? null,
      })),
    };
  },
};
