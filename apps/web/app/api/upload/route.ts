import { NextRequest, NextResponse } from 'next/server';
import { mkdir } from 'fs/promises';
import { resolve } from 'path';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { logger } from '@/lib/logger';
import { ErrorCodes } from '@/types/api';
import {
  UPLOAD_DIR,
  SESSION_TTL_MS,
  resolveMime,
  validateFile,
  saveFileToDisk,
  createFileRecordAndEnqueue,
  sortByProcessingSpeed,
} from '@/lib/api/upload';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    const existingSessionId = formData.get('sessionId') as string | null;

    if (!files.length) {
      return NextResponse.json(
        { error: 'No files provided', code: ErrorCodes.VALIDATION_ERROR },
        { status: 400 }
      );
    }

    // Create or reuse session
    let session = existingSessionId
      ? await prisma.session.findUnique({ where: { id: existingSessionId } })
      : null;
    if (!session) {
      const formWindowSize = formData.get('windowSize') ? parseInt(formData.get('windowSize') as string, 10) : undefined;
      const formMinConnections = formData.get('minConnections') ? parseInt(formData.get('minConnections') as string, 10) : undefined;
      const formMinOccurrences = formData.get('minOccurrences') ? parseInt(formData.get('minOccurrences') as string, 10) : undefined;
      const formMinEdgeWeight = formData.get('minEdgeWeight') ? parseFloat(formData.get('minEdgeWeight') as string) : undefined;

      session = await prisma.session.create({
        data: {
          expiresAt: new Date(Date.now() + SESSION_TTL_MS),
          windowSize: typeof formWindowSize === 'number' && !isNaN(formWindowSize) ? formWindowSize : undefined,
          minConnections: typeof formMinConnections === 'number' && !isNaN(formMinConnections) ? formMinConnections : undefined,
          minOccurrences: typeof formMinOccurrences === 'number' && !isNaN(formMinOccurrences) ? formMinOccurrences : undefined,
          minEdgeWeight: typeof formMinEdgeWeight === 'number' && !isNaN(formMinEdgeWeight) ? formMinEdgeWeight : undefined,
        },
      });
    }

    const windowSize = session.windowSize ?? 400;
    await redis.setex(`session:window_size:${session.id}`, 24 * 60 * 60, String(windowSize));
    await mkdir(resolve(process.cwd(), UPLOAD_DIR), { recursive: true });

    const pending: { file: File; mime: string }[] = [];
    const skipped: { name: string; reason: string }[] = [];

    for (const file of files) {
      const mime = resolveMime(file);
      const reason = validateFile(file, mime);
      if (reason) {
        logger.warn('File skipped', { name: file.name, reason });
        skipped.push({ name: file.name, reason });
        continue;
      }
      pending.push({ file, mime });
    }

    const sorted = sortByProcessingSpeed(pending);
    const jobs = [];

    for (const { file, mime } of sorted as { file: File; mime: string }[]) {
      const { storagePath, originalCreatedAt } = await saveFileToDisk(file, session.id);
      const job = await createFileRecordAndEnqueue(file, mime, session.id, storagePath, originalCreatedAt, windowSize);
      jobs.push(job);
    }

    return NextResponse.json({ sessionId: session.id, jobs, skipped }, { status: 202 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Upload failed', { error: msg });
    return NextResponse.json({ error: msg, code: ErrorCodes.INTERNAL_ERROR }, { status: 500 });
  }
}
