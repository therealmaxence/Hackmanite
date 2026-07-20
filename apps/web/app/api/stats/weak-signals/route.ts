import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/types/api';
import { computeWeakSignals } from '@/lib/pipeline/weakSignals';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required', code: ErrorCodes.VALIDATION_ERROR }, { status: 400 });
  }

  try {
    const files = await prisma.file.findMany({ where: { sessionId, status: 'DONE' }, select: { id: true, originalCreatedAt: true } });
    const fileIds = files.map((f) => f.id);
    if (!fileIds.length) return NextResponse.json({ bridgeSignals: [], nicheSignals: [], emergingSignals: [] });

    const [occurrences, neighborhoods] = await Promise.all([
      prisma.occurrence.findMany({
        where: { fileId: { in: fileIds } },
        select: { entityId: true, fileId: true, count: true, tfidf: true, entity: { select: { displayName: true, type: true } } },
      }),
      prisma.entityNeighborhood.findMany({
        where: { fileId: { in: fileIds } },
        select: { sourceEntityId: true, targetEntityId: true, weight: true },
      }),
    ]);

    // Build the format required by computeWeakSignals
    const filesMap = new Map(files.map((f) => [f.id, f]));
    const entityOccurrencesMap = new Map<string, { entity: any; occurrences: any[] }>();

    for (const occ of occurrences) {
      if (!occ.entity) continue;
      const file = filesMap.get(occ.fileId);
      const cur = entityOccurrencesMap.get(occ.entityId) ?? { entity: occ.entity, occurrences: [] };
      cur.occurrences.push({
        fileId: occ.fileId,
        count: occ.count,
        tfidf: occ.tfidf,
        originalCreatedAt: file?.originalCreatedAt?.toISOString() ?? null,
      });
      entityOccurrencesMap.set(occ.entityId, cur);
    }

    const nodes = Array.from(entityOccurrencesMap.entries()).map(([entityId, val]) => ({
      id: entityId,
      label: val.entity.displayName,
      type: val.entity.type,
      occurrences: val.occurrences,
    }));

    const edges = neighborhoods.map((n) => ({
      source: n.sourceEntityId,
      target: n.targetEntityId,
      weight: n.weight,
    }));

    const { bridgeSignals, nicheSignals, emergingSignals } = computeWeakSignals({ nodes, edges });

    return NextResponse.json({ bridgeSignals, nicheSignals, emergingSignals });
  } catch (err: unknown) {
    console.error('Weak Signals API Error:', err);
    return NextResponse.json({ error: 'Internal Server Error', code: ErrorCodes.INTERNAL_ERROR }, { status: 500 });
  }
}
