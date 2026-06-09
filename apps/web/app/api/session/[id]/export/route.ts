import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { ErrorCodes } from '@/types/api';
import { EntityType } from '@/types/entities';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;

  try {
    const files = await prisma.file.findMany({
      where: { sessionId },
      select: {
        id: true,
        originalName: true,
        mimeType: true,
        sizeBytes: true,
        originalCreatedAt: true,
      },
    });

    const sessionRecord = await prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        windowSize: true,
        minConnections: true,
        minOccurrences: true,
        minEdgeWeight: true,
      },
    });

    const windowSize = sessionRecord?.windowSize ?? 400;
    const minConnections = sessionRecord?.minConnections ?? 2;
    const minOccurrences = sessionRecord?.minOccurrences ?? 2;
    const minEdgeWeight = sessionRecord?.minEdgeWeight ?? 0.0;

    if (files.length === 0) {
      return NextResponse.json({
        sessionId,
        exportedAt: new Date().toISOString(),
        windowSize,
        minConnections,
        minOccurrences,
        minEdgeWeight,
        nodes: [],
        edges: [],
      });
    }

    const filesMap = new Map(files.map((f) => [f.id, f]));
    const fileIds = files.map((f) => f.id);

    const entityOccurrencesMap = new Map<
      string,
      {
        entity: any;
        occurrences: Array<{
          fileId: string;
          fileName: string;
          mimeType: string;
          sizeBytes: number;
          count: number;
          excerpts: any;
          originalCreatedAt: string | null;
        }>;
      }
    >();

    const BATCH_SIZE = 100;
    for (let i = 0; i < fileIds.length; i += BATCH_SIZE) {
      const batchFileIds = fileIds.slice(i, i + BATCH_SIZE);
      const occurrences = await prisma.occurrence.findMany({
        where: { fileId: { in: batchFileIds } },
        include: { entity: true },
      });

      for (const occurrence of occurrences) {
        const entity = occurrence.entity;
        const file = filesMap.get(occurrence.fileId);
        if (!entity || !file) continue;

        const cur = entityOccurrencesMap.get(entity.id) ?? {
          entity,
          occurrences: [],
        };
        cur.occurrences.push({
          fileId: file.id,
          fileName: file.originalName,
          mimeType: file.mimeType,
          sizeBytes: Number(file.sizeBytes),
          count: occurrence.count,
          excerpts: occurrence.excerpts,
          originalCreatedAt: file.originalCreatedAt
            ? file.originalCreatedAt.toISOString()
            : null,
        });
        entityOccurrencesMap.set(entity.id, cur);
      }
    }

    const nodes = Array.from(entityOccurrencesMap.entries()).map(([entityId, val]) => ({
      id: entityId,
      label: val.entity.displayName,
      type: val.entity.type as EntityType,
      canonical: val.entity.canonical,
      metadata: val.entity.metadata,
      occurrences: val.occurrences,
    }));

    const edges: any[] = [];
    for (let i = 0; i < fileIds.length; i += BATCH_SIZE) {
      const batchFileIds = fileIds.slice(i, i + BATCH_SIZE);
      const neighborhoods = await prisma.entityNeighborhood.findMany({
        where: { fileId: { in: batchFileIds } },
        include: {
          file: {
            select: {
              originalName: true,
            },
          },
        },
      });

      for (const n of neighborhoods) {
        edges.push({
          source: n.sourceEntityId,
          target: n.targetEntityId,
          weight: n.weight,
          distance: n.distance,
          snippet: n.snippet,
          sourceOffset: n.sourceOffset,
          targetOffset: n.targetOffset,
          fileId: n.fileId,
          fileName: n.file.originalName,
        });
      }
    }

    const emails = await prisma.email.findMany({
      where: { fileId: { in: fileIds } },
      include: {
        file: {
          select: {
            originalName: true,
            mimeType: true,
            sizeBytes: true,
            originalCreatedAt: true,
          },
        },
      },
    });

    const exportedEmails = emails.map((e) => ({
      id: e.id,
      messageId: e.messageId,
      inReplyTo: e.inReplyTo,
      references: e.references,
      subject: e.subject,
      from: e.from,
      to: e.to,
      cc: e.cc,
      date: e.date ? e.date.toISOString() : null,
      body: e.body,
      attachments: e.attachments,
      fileId: e.fileId,
      fileName: e.file?.originalName || null,
      fileMimeType: e.file?.mimeType || null,
      fileSizeBytes: e.file ? Number(e.file.sizeBytes) : null,
      fileOriginalCreatedAt: e.file?.originalCreatedAt ? e.file.originalCreatedAt.toISOString() : null,
    }));

    return NextResponse.json({
      sessionId,
      exportedAt: new Date().toISOString(),
      windowSize,
      minConnections,
      minOccurrences,
      minEdgeWeight,
      nodes,
      edges,
      emails: exportedEmails,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: msg, code: ErrorCodes.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}