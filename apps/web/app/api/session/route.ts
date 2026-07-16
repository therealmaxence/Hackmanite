import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/types/api';
import { cache } from '@/lib/cache';
import { NLP_URL } from '@/lib/nlp-url';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const sessions = await prisma.session.findMany({
      include: {
        files: {
          select: { id: true, originalName: true, status: true, sizeBytes: true, mimeType: true, uploadedAt: true, occurrences: { select: { id: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(sessions.map((session) => ({
      id: session.id,
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      fileCount: session.files.length,
      entityCount: session.files.reduce((sum, f) => sum + f.occurrences.length, 0),
      fileNames: session.files.map((f) => f.originalName).slice(0, 3),
      files: session.files.map((f) => ({
        fileId: f.id,
        jobId: `imported-${f.id}`,
        originalName: f.originalName,
        status: f.status as any,
        entityCount: f.occurrences.length,
        error: null,
        sizeBytes: Number(f.sizeBytes),
        mimeType: f.mimeType,
        addedAt: f.uploadedAt.getTime(),
      })),
    })));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg, code: ErrorCodes.INTERNAL_ERROR }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await prisma.session.deleteMany();
    await cache.flushdb();
    const upstream = await fetch(`${NLP_URL}/graph`, { method: 'DELETE' });
    if (!upstream.ok) throw new Error(`Upstream graph service clear error ${upstream.status}`);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg, code: ErrorCodes.INTERNAL_ERROR }, { status: 500 });
  }
}
