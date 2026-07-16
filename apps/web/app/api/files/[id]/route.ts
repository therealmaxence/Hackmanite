import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { clearSessionGraphCache } from '@/lib/cache';
import { ErrorCodes } from '@/types/api';
import { recomputeSessionTfidf } from '@/lib/api/tfidf';
import { NLP_URL } from '@/lib/nlp-url';

export const runtime = 'nodejs';

const errMsg = (err: unknown) => (err instanceof Error ? err.message : 'Unknown error');

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const file = await prisma.file.findUnique({
      where: { id },
      include: { occurrences: { include: { entity: true }, orderBy: { count: 'desc' } } },
    });

    if (!file)
      return NextResponse.json({ error: 'File not found', code: ErrorCodes.NOT_FOUND }, { status: 404 });

    return NextResponse.json({
      id: file.id,
      originalName: file.originalName,
      mimeType: file.mimeType,
      sizeBytes: Number(file.sizeBytes),
      status: file.status,
      errorMessage: file.errorMessage,
      uploadedAt: file.uploadedAt.toISOString(),
      processedAt: file.processedAt?.toISOString() ?? null,
      entities: file.occurrences.map((o) => ({
        id: o.entity.id,
        displayName: o.entity.displayName,
        type: o.entity.type,
        count: o.count,
      })),
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: errMsg(err), code: ErrorCodes.INTERNAL_ERROR }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const file = await prisma.file.findUnique({ where: { id }, select: { sessionId: true } });

    if (!file)
      return NextResponse.json({ error: 'File not found', code: ErrorCodes.NOT_FOUND }, { status: 404 });

    await prisma.file.delete({ where: { id } });

    try {
      const res = await fetch(`${NLP_URL}/graph/file/${id}`, { method: 'DELETE' });
      if (!res.ok) console.error(`Failed to delete file in KuzuDB, status: ${res.status}`);
    } catch (err) {
      console.error('Failed to contact Python service for KuzuDB file delete:', err);
    }

    await recomputeSessionTfidf(file.sessionId);
    await clearSessionGraphCache(file.sessionId);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: errMsg(err), code: ErrorCodes.INTERNAL_ERROR }, { status: 500 });
  }
}
