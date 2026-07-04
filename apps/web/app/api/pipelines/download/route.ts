import { NextRequest, NextResponse } from 'next/server';
import { createReadStream } from 'fs';
import { basename, extname, isAbsolute, relative, resolve } from 'path';
import { Readable } from 'stream';
import { UPLOAD_DIR } from '@/lib/api/upload';
import { ErrorCodes } from '@/types/api';

export const runtime = 'nodejs';

const CONTENT_TYPES: Record<string, string> = {
  '.json': 'application/json',
  '.graphml': 'application/xml',
  '.xml': 'application/xml',
  '.zip': 'application/zip',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

function toAbsolutePath(path: string) {
  return isAbsolute(path) ? resolve(path) : resolve(process.cwd(), path);
}

function isWithin(root: string, path: string) {
  const rel = relative(root, path);
  return rel === '' || (!!rel && !rel.startsWith('..') && !isAbsolute(rel));
}

export async function GET(req: NextRequest) {
  try {
    const relativePath = req.nextUrl.searchParams.get('path');
    if (!relativePath) {
      return NextResponse.json({ error: 'path is required', code: ErrorCodes.VALIDATION_ERROR }, { status: 400 });
    }

    const absolutePath = toAbsolutePath(relativePath);
    const allowedRoots = [resolve(process.cwd()), toAbsolutePath(UPLOAD_DIR)];
    if (!allowedRoots.some((root) => isWithin(root, absolutePath))) {
      return NextResponse.json({ error: 'Invalid export path', code: ErrorCodes.VALIDATION_ERROR }, { status: 400 });
    }

    const fileName = basename(absolutePath);
    const mimeType = CONTENT_TYPES[extname(fileName).toLowerCase()] || 'application/octet-stream';

    return new Response(Readable.toWeb(createReadStream(absolutePath)) as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg, code: ErrorCodes.INTERNAL_ERROR }, { status: 500 });
  }
}
