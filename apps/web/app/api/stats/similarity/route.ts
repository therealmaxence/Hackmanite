import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/types/api';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const sessionId = new URL(req.url).searchParams.get('sessionId');
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required', code: ErrorCodes.VALIDATION_ERROR }, { status: 400 });
  }

  try {
    const files = await prisma.file.findMany({
      where: { sessionId },
      select: { id: true, originalName: true },
      orderBy: { occurrences: { _count: 'desc' } },
      take: 20,
    });

    if (!files.length) return NextResponse.json({ files: [], matrix: [] });

    const fileIds = files.map((f) => f.id);
    const occurrences = await prisma.occurrence.findMany({
      where: { fileId: { in: fileIds } },
      select: { entityId: true, fileId: true },
    });

    const fileEntitiesMap = new Map<string, Set<string>>();
    for (const { fileId, entityId } of occurrences) {
      const s = fileEntitiesMap.get(fileId) ?? new Set<string>();
      s.add(entityId);
      fileEntitiesMap.set(fileId, s);
    }

    const matrix = files.map((a, i) => files.map((b, j) => {
      if (i === j) return 1.0;
      const setA = fileEntitiesMap.get(a.id) ?? new Set();
      const setB = fileEntitiesMap.get(b.id) ?? new Set();
      let intersect = 0;
      for (const id of setA) if (setB.has(id)) intersect++;
      const union = setA.size + setB.size - intersect;
      return parseFloat((union > 0 ? intersect / union : 0).toFixed(4));
    }));

    return NextResponse.json({ files: files.map((f) => ({ id: f.id, name: f.originalName })), matrix });
  } catch (err: unknown) {
    console.error('Similarity API Error:', err);
    return NextResponse.json({ error: 'Internal Server Error', code: ErrorCodes.INTERNAL_ERROR }, { status: 500 });
  }
}
