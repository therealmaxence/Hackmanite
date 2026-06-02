import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/types/api';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NLP_URL = process.env.NLP_SERVICE_URL || 'http://localhost:8000';

export async function GET(req: NextRequest) {
  try {
    const sessions = await prisma.session.findMany({
      include: {
        files: {
          select: {
            id: true,
            originalName: true,
            status: true,
            sizeBytes: true,
            mimeType: true,
            uploadedAt: true,
            occurrences: {
              select: {
                id: true,
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      }
    });

    const result = sessions.map(session => {
      const fileCount = session.files.length;
      const entityCount = session.files.reduce((sum, file) => sum + file.occurrences.length, 0);
      const fileNames = session.files.map(f => f.originalName).slice(0, 3);
      
      return {
        id: session.id,
        createdAt: session.createdAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
        fileCount,
        entityCount,
        fileNames,
        files: session.files.map(f => ({
          fileId: f.id,
          jobId: `imported-${f.id}`,
          originalName: f.originalName,
          status: f.status as any,
          entityCount: f.occurrences.length,
          error: null,
          sizeBytes: Number(f.sizeBytes),
          mimeType: f.mimeType,
          addedAt: f.uploadedAt.getTime(),
        }))
      };
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: msg, code: ErrorCodes.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // 1. Delete all sessions in SQLite (triggers cascade delete for all files, emails, occurrences, edges)
    await prisma.session.deleteMany();

    // 2. Clear all cached graph responses in our simulated Redis
    await redis.flushdb();

    // 3. Detach delete all entities and file refs inside KuzuDB
    const upstream = await fetch(`${NLP_URL}/graph`, { method: 'DELETE' });
    if (!upstream.ok) {
      throw new Error(`Upstream graph service clear error ${upstream.status}`);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: msg, code: ErrorCodes.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}
