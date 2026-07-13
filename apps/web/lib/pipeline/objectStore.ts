import fs from 'fs';
import path from 'path';
import { logger } from '@/lib/logger';
import { PipelineData } from './executor';

const fsPromises = fs.promises;

const getCacheDir = (): string => {
  if (process.env.SHARED_CACHE_DIR) {
    return process.env.SHARED_CACHE_DIR;
  }
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  return path.resolve(process.cwd(), uploadDir, 'pipeline-cache');
};

export async function savePayload(
  runId: string,
  nodeId: string,
  outputId: string,
  data: PipelineData
): Promise<string> {
  const cacheDir = getCacheDir();
  const filename = `${runId}_${nodeId}_${outputId}.json`;
  const fullPath = path.join(cacheDir, filename);

  try {
    await fsPromises.mkdir(cacheDir, { recursive: true });
    await fsPromises.writeFile(fullPath, JSON.stringify(data), 'utf-8');
    logger.info('Saved pipeline payload to store', { runId, nodeId, outputId, path: fullPath });
    return `file://${fullPath}`;
  } catch (err: any) {
    logger.error('Failed to save pipeline payload to store', { runId, nodeId, error: err.message });
    throw err;
  }
}

export async function loadPayload(uri: string): Promise<PipelineData> {
  try {
    if (!uri.startsWith('file://')) {
      throw new Error(`Unsupported object store URI protocol: ${uri}`);
    }
    const fullPath = uri.substring(7);
    const content = await fsPromises.readFile(fullPath, 'utf-8');
    return JSON.parse(content) as PipelineData;
  } catch (err: any) {
    logger.error('Failed to load pipeline payload from store', { uri, error: err.message });
    throw err;
  }
}

export function getPayloadUri(runId: string, nodeId: string, outputId: string): string {
  const cacheDir = getCacheDir();
  const filename = `${runId}_${nodeId}_${outputId}.json`;
  return `file://${path.join(cacheDir, filename)}`;
}
