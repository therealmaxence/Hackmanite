import { UPLOAD_DIR } from '@/lib/api/upload';
import { mkdir } from 'fs/promises';
import { isAbsolute, join, resolve } from 'path';

function toAbsolutePath(path: string) {
  return isAbsolute(path) ? resolve(path) : resolve(process.cwd(), path);
}

export async function resolveExportPath(fileName: string, config: any, context: any) {
  const exportLocation = config?.exportLocation || 'downloads';
  let exportFolder = join(UPLOAD_DIR, 'exports');
  if (exportLocation === 'session' && context.sessionId) exportFolder = join(UPLOAD_DIR, context.sessionId);
  else if (exportLocation === 'custom' && config?.exportFolder) exportFolder = config.exportFolder;
  const absoluteFolder = toAbsolutePath(exportFolder);
  const absolutePath = join(absoluteFolder, fileName);
  await mkdir(absoluteFolder, { recursive: true });
  return { absolutePath, relativePath: isAbsolute(exportFolder) ? absolutePath : join(exportFolder, fileName) };
}

export function buildDownloadResult(fileName: string, content: string, mimeType: string, relativePath: string, isBase64?: boolean) {
  return { type: 'file_download' as const, value: { fileName, content, mimeType, isBase64, relativePath } };
}

export function ensureExtension(fileName: string, extension: string) {
  return fileName.endsWith(extension) ? fileName : `${fileName}${extension}`;
}
