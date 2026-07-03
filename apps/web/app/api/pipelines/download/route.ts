import { NextRequest, NextResponse } from 'next/server';
import { createReadStream } from 'fs';
import { basename, extname, resolve, sep } from 'path';
import { Readable } from 'stream';
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

export async function GET(req: NextRequest) {
  try {
    const relativePath = req.nextUrl.searchParams.get('path');
    if (!relativePath) {
      return NextResponse.json({ error: 'path is required', code: ErrorCodes.VALIDATION_ERROR }, { status: 400 });
    }

    const absolutePath = resolve(process.cwd(), relativePath);
    const workspaceRoot = resolve(process.cwd()) + sep;
    if (!absolutePath.startsWith(workspaceRoot)) {
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