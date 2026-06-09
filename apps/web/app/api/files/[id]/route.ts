import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redis, RedisKeys, clearSessionGraphCache } from '@/lib/redis';
import { ErrorCodes } from '@/types/api';
import { recomputeSessionTfidf } from '@/lib/api/tfidf';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const file = await prisma.file.findUnique({
      where: { id },
      include: {
        occurrences: {
          include: { entity: true },
          orderBy: { count: 'desc' },
        },
      },
    });

    if (!file) {
      return NextResponse.json(
        { error: 'File not found', code: ErrorCodes.NOT_FOUND },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: file.id,
      originalName: file.originalName,
      mimeType: file.mimeType,
      sizeBytes: Number(file.sizeBytes),
      status: file.status,
      errorMessage: file.errorMessage,
      uploadedAt: file.uploadedAt.toISOString(),
      processedAt: file.processedAt ? file.processedAt.toISOString() : null,
      entities: file.occurrences.map((o) => ({
        id: o.entity.id,
        displayName: o.entity.displayName,
        type: o.entity.type,
        count: o.count,
      })),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: msg, code: ErrorCodes.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const file = await prisma.file.findUnique({
      where: { id },
      select: { sessionId: true },
    });

    if (!file) {
      return NextResponse.json(
        { error: 'File not found', code: ErrorCodes.NOT_FOUND },
        { status: 404 }
      );
    }

    await prisma.file.delete({
      where: { id },
    });

    // Delete in KuzuDB
    try {
      const nlpUrl = process.env.NLP_SERVICE_URL || 'http://localhost:8000';
      const kuzuFileDeleteRes = await fetch(`${nlpUrl}/graph/file/${id}`, {
        method: 'DELETE',
      });
      if (!kuzuFileDeleteRes.ok) {
        console.error(`Failed to delete file in KuzuDB, status: ${kuzuFileDeleteRes.status}`);
      }
    } catch (err) {
      console.error('Failed to contact Python service for KuzuDB file delete:', err);
    }

    // Recompute TF-IDF for the session
    await recomputeSessionTfidf(file.sessionId);

    // Clear cache
    await clearSessionGraphCache(file.sessionId);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: msg, code: ErrorCodes.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}
