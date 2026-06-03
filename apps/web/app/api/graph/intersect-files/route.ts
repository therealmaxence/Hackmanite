import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/types/api';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');
  const nodeIdsParam = searchParams.get('nodeIds');

  if (!sessionId || !nodeIdsParam) {
    return NextResponse.json(
      { error: 'sessionId and nodeIds required', code: ErrorCodes.VALIDATION_ERROR },
      { status: 400 }
    );
  }

  try {
    const nodeIds = nodeIdsParam.split(',').filter(Boolean);
    if (nodeIds.length === 0) {
      return NextResponse.json({ files: [] });
    }

    const occurrences = await prisma.occurrence.findMany({
      where: {
        entityId: { in: nodeIds },
        file: { sessionId },
      },
      select: {
        fileId: true,
        entityId: true,
      },
    });

    const fileEntityMap = new Map<string, Set<string>>();
    for (const occ of occurrences) {
      if (!fileEntityMap.has(occ.fileId)) {
        fileEntityMap.set(occ.fileId, new Set());
      }
      fileEntityMap.get(occ.fileId)!.add(occ.entityId);
    }

    const matchingFileIds: string[] = [];
    for (const [fileId, entities] of fileEntityMap.entries()) {
      if (entities.size === nodeIds.length) {
        matchingFileIds.push(fileId);
      }
    }

    if (matchingFileIds.length === 0) {
      return NextResponse.json({ files: [] });
    }

    const files = await prisma.file.findMany({
      where: { id: { in: matchingFileIds } },
      select: {
        id: true,
        originalName: true,
        mimeType: true,
        sizeBytes: true,
        processedAt: true,
      },
      orderBy: { originalName: 'asc' },
    });

    const result = files.map((f) => ({
      id: f.id,
      originalName: f.originalName,
      mimeType: f.mimeType,
      sizeBytes: Number(f.sizeBytes),
      processedAt: f.processedAt ? f.processedAt.toISOString() : null,
    }));

    return NextResponse.json({ files: result });
  } catch (err: any) {
    console.error('Intersect Files API Error:', err);
    return NextResponse.json(
      { error: err.message || 'Unknown error', code: ErrorCodes.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}
