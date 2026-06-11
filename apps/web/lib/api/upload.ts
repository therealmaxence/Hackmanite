import { writeFile, mkdir, stat } from 'fs/promises';
import { join, extname, resolve, dirname } from 'path';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { extractionQueue } from '@/lib/queue';
import { logger } from '@/lib/logger';
import { redis, RedisKeys } from '@/lib/redis';

export const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
export const MAX_SIZE = Number(process.env.MAX_FILE_SIZE_MB || 100) * 1024 * 1024;
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export const ALLOWED_MIMES = new Set([
  'text/plain', 'text/markdown', 'text/csv', 'text/html',
  'application/pdf',
  'application/json',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
  'image/png', 'image/jpeg', 'image/tiff', 'image/webp',
  'text/x-python', 'application/x-python',
  'text/javascript', 'application/javascript',
  'text/x-sh',
  'message/rfc822',
  'application/vnd.ms-outlook',
  'application/vnd.ms-outlook-pst',
  'application/x-outlook-pst',
]);

const EXT_MIME_MAP: Record<string, string> = {
  '.py': 'text/x-python',
  '.js': 'text/javascript',
  '.jsx': 'text/javascript',
  '.ts': 'text/javascript',
  '.tsx': 'text/javascript',
  '.sh': 'text/x-sh',
  '.csv': 'text/csv',
  '.json': 'application/json',
  '.md': 'text/markdown',
  '.txt': 'text/plain',
  '.eml': 'message/rfc822',
  '.pst': 'application/vnd.ms-outlook',
};

export function resolveMime(file: File): string {
  let mime = file.type || 'application/octet-stream';
  if (mime === 'application/octet-stream') {
    const ext = extname(file.name).toLowerCase();
    mime = EXT_MIME_MAP[ext] ?? mime;
  }
  return mime;
}

export function validateFile(file: File, mime: string): string | null {
  if (file.size > MAX_SIZE) return 'File exceeds size limit';
  if (!ALLOWED_MIMES.has(mime)) return `Unsupported type: ${mime}`;
  return null;
}

// Write the file buffer to disk, return storagePath and originalCreatedAt
export async function saveFileToDisk(
  file: File,
  sessionId: string
): Promise<{ storagePath: string; originalCreatedAt: Date | null }> {
  const ext = extname(file.name) || '';
  const storageName = `${randomUUID()}${ext}`;
  const storagePath = join(UPLOAD_DIR, sessionId, storageName);
  const absolutePath = resolve(process.cwd(), storagePath);

  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));

  let originalCreatedAt: Date | null = null;
  try {
    const s = await stat(absolutePath);
    originalCreatedAt = s.birthtime ?? null;
  } catch {
    // ignore
  }
  return { storagePath, originalCreatedAt };
}

export async function createFileRecordAndEnqueue(
  file: File,
  mime: string,
  sessionId: string,
  storagePath: string,
  originalCreatedAt: Date | null,
  windowSize: number
) {
  await redis.del(RedisKeys.sessionCancellation(sessionId));

  const fileRecord = await prisma.file.create({
    data: {
      sessionId,
      originalName: file.name,
      storagePath,
      mimeType: mime,
      sizeBytes: BigInt(file.size),
      status: 'PENDING',
      originalCreatedAt: originalCreatedAt ?? undefined,
    },
  });

  const isSlow = mime.startsWith('image/') || mime.startsWith('application/pdf');
  const priority = isSlow ? 10 : 1;

  const job = await extractionQueue.add(
    { fileId: fileRecord.id, sessionId, storagePath, mimeType: mime, windowSize },
    { priority }
  );

  logger.info('File queued', {
    fileId: fileRecord.id,
    name: fileRecord.originalName,
    sessionId,
    priority,
  });

  return { fileId: fileRecord.id, jobId: String(job.id), originalName: fileRecord.originalName };
}

// Sort files so fast (text) jobs run before slow (image/pdf) jobs
export function sortByProcessingSpeed(files: { mime: string; [k: string]: unknown }[]) {
  return [...files].sort((a, b) => {
    const aSlow = a.mime.startsWith('image/') || a.mime === 'application/pdf';
    const bSlow = b.mime.startsWith('image/') || b.mime === 'application/pdf';
    if (aSlow && !bSlow) return 1;
    if (!aSlow && bSlow) return -1;
    return 0;
  });
}
