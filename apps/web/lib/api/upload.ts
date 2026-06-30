import { writeFile, mkdir, stat } from 'fs/promises';
import { join, extname, resolve, dirname } from 'path';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { extractionQueue } from '@/lib/queue';
import { logger } from '@/lib/logger';
import { redis, RedisKeys } from '@/lib/redis';

export const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
export const MAX_SIZE = Number(process.env.MAX_FILE_SIZE_MB || 500) * 1024 * 1024;
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export const ALLOWED_MIMES = new Set([
  'text/plain', 'text/markdown', 'text/csv', 'text/html',
  'application/pdf', 'application/json',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword', 'image/png', 'image/jpeg', 'image/tiff', 'image/webp',
  'text/x-python', 'application/x-python', 'text/javascript', 'application/javascript',
  'text/x-sh', 'message/rfc822', 'application/vnd.ms-outlook', 'application/x-outlook-pst',
  'application/vnd.ms-outlook-pst',
]);

const EXT_MIME_MAP: Record<string, string> = {
  '.py': 'text/x-python', '.js': 'text/javascript', '.jsx': 'text/javascript',
  '.ts': 'text/javascript', '.tsx': 'text/javascript', '.sh': 'text/x-sh',
  '.csv': 'text/csv', '.json': 'application/json', '.md': 'text/markdown',
  '.txt': 'text/plain', '.eml': 'message/rfc822', '.pst': 'application/vnd.ms-outlook',
};

export function resolveMime(file: File): string {
  const mime = file.type || 'application/octet-stream';
  return mime === 'application/octet-stream' ? EXT_MIME_MAP[extname(file.name).toLowerCase()] ?? mime : mime;
}

export function validateFile(file: File, mime: string): string | null {
  if (file.size > MAX_SIZE) return 'File exceeds size limit';
  if (!ALLOWED_MIMES.has(mime)) return `Unsupported type: ${mime}`;
  return null;
}

export async function saveFileToDisk(
  file: File,
  sessionId: string
): Promise<{ storagePath: string; originalCreatedAt: Date | null }> {
  const storagePath = join(UPLOAD_DIR, sessionId, `${randomUUID()}${extname(file.name) || ''}`);
  const absolutePath = resolve(process.cwd(), storagePath);

  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));

  let originalCreatedAt: Date | null = null;
  try {
    originalCreatedAt = (await stat(absolutePath)).birthtime ?? null;
  } catch {}
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

  const priority = mime.startsWith('image/') || mime.startsWith('application/pdf') ? 10 : 1;
  const job = await extractionQueue.add(
    { fileId: fileRecord.id, sessionId, storagePath, mimeType: mime, windowSize },
    { priority }
  );

  logger.info('File queued', { fileId: fileRecord.id, name: fileRecord.originalName, sessionId, priority });
  return { fileId: fileRecord.id, jobId: String(job.id), originalName: fileRecord.originalName };
}

export function sortByProcessingSpeed(files: { mime: string; [k: string]: unknown }[]) {
  const isSlow = (m: string) => m.startsWith('image/') || m === 'application/pdf';
  return [...files].sort((a, b) => Number(isSlow(a.mime)) - Number(isSlow(b.mime)));
}
