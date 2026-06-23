import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
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

    const matchingFiles = await prisma.$queryRaw<any[]>`
      SELECT o.fileId
      FROM occurrences o
      JOIN files f ON f.id = o.fileId
      WHERE f.sessionId = ${sessionId} AND o.entityId IN (${Prisma.join(nodeIds)})
      GROUP BY o.fileId
      HAVING COUNT(DISTINCT o.entityId) = ${nodeIds.length}
    `;

    const matchingFileIds = matchingFiles.map((f) => f.fileId);

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
