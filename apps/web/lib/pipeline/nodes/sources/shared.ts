import { prisma } from '@/lib/prisma';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { basename, resolve } from 'path';

export function serializeRow(row: any) {
  const obj: any = {};
  for (const key of Object.keys(row)) {
    const value = row[key];
    obj[key] = typeof value === 'bigint' ? Number(value) : value;
  }
  return obj;
}

export async function readPipelineTextFile(config: any, context: any, label: string) {
  const filePath = config?.filePath;
  const fileIds = Array.isArray(config?.fileIds) ? config.fileIds.filter(Boolean).map(String) : [];
  const dbFile = fileIds.length
    ? await prisma.file.findFirst({ where: { id: fileIds[0] } })
    : filePath
      ? await prisma.file.findFirst({ where: { OR: [{ id: filePath }, { originalName: filePath }, { storagePath: filePath }] } })
      : null;

  if (!dbFile && !filePath) throw new Error('Missing parameter: filePath or fileIds');

  const diskPath = dbFile?.storagePath || filePath;
  const absolutePath = resolve(process.cwd(), diskPath);
  if (!existsSync(absolutePath)) throw new Error(`Path does not exist: ${filePath || dbFile?.originalName}`);

  const fileName = dbFile?.originalName || basename(filePath);
  await context.log(`Reading ${label} from ${dbFile ? 'session uploads' : 'local disk'}: ${fileName}`);
  return {
    content: await readFile(absolutePath, 'utf8'),
    fileId: dbFile?.id || filePath,
    fileName,
    mimeType: dbFile?.mimeType || 'text/plain',
  };
}
