import { NextRequest, NextResponse } from 'next/server';
import { mkdir } from 'fs/promises';
import { resolve } from 'path';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { logger } from '@/lib/logger';
import { ErrorCodes } from '@/types/api';
import {
  UPLOAD_DIR, SESSION_TTL_MS,
  resolveMime, validateFile, saveFileToDisk, createFileRecord, createFileRecordAndEnqueue, sortByProcessingSpeed,
} from '@/lib/api/upload';

export const runtime = 'nodejs';

const getIntParam = (fd: FormData, key: string) => { const v = fd.get(key); return v ? parseInt(v as string, 10) : undefined; };
const getFloatParam = (fd: FormData, key: string) => { const v = fd.get(key); return v ? parseFloat(v as string) : undefined; };

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    const existingSessionId = formData.get('sessionId') as string | null;
    const pipelineOnly = formData.get('pipelineOnly') === 'true';

    if (!files.length) {
      return NextResponse.json({ error: 'No files provided', code: ErrorCodes.VALIDATION_ERROR }, { status: 400 });
    }

    let session = existingSessionId
      ? await prisma.session.findUnique({ where: { id: existingSessionId } })
      : null;

    if (!session) {
      session = await prisma.session.create({
        data: {
          expiresAt: new Date(Date.now() + SESSION_TTL_MS),
          windowSize: getIntParam(formData, 'windowSize'),
          minConnections: getIntParam(formData, 'minConnections'),
          minOccurrences: getIntParam(formData, 'minOccurrences'),
          minEdgeWeight: getFloatParam(formData, 'minEdgeWeight'),
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
      if (reason) { logger.warn('File skipped', { name: file.name, reason }); skipped.push({ name: file.name, reason }); continue; }
      pending.push({ file, mime });
    }

    const jobs = [];
    for (const { file, mime } of sortByProcessingSpeed(pending) as { file: File; mime: string }[]) {
      const { storagePath, originalCreatedAt } = await saveFileToDisk(file, session.id);
      if (pipelineOnly) {
        const fileRecord = await createFileRecord(file, mime, session.id, storagePath, originalCreatedAt, 'DONE');
        jobs.push({ fileId: fileRecord.id, jobId: `pipeline-${fileRecord.id}`, originalName: fileRecord.originalName });
      } else {
        jobs.push(await createFileRecordAndEnqueue(file, mime, session.id, storagePath, originalCreatedAt, windowSize));
      }
    }

    return NextResponse.json({ sessionId: session.id, jobs, skipped }, { status: 202 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Upload failed', { error: msg });
    return NextResponse.json({ error: msg, code: ErrorCodes.INTERNAL_ERROR }, { status: 500 });
  }
}
