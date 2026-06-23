import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { ErrorCodes } from '@/types/api';

export const runtime = 'nodejs';

const FORCE_PLAIN_TEXT = new Set([
  'application/json', 'text/csv', 'text/x-python', 'application/x-python',
  'text/javascript', 'application/javascript', 'text/x-sh', 'application/octet-stream',
]);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const file = await prisma.file.findUnique({ where: { id } });

    if (!file)
      return NextResponse.json({ error: 'File not found', code: ErrorCodes.NOT_FOUND }, { status: 404 });

    const contentType = FORCE_PLAIN_TEXT.has(file.mimeType || '')
      ? 'text/plain; charset=utf-8'
      : file.mimeType || 'application/octet-stream';

    return new NextResponse(await readFile(resolve(process.cwd(), file.storagePath)), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${file.originalName}"`,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg, code: ErrorCodes.INTERNAL_ERROR }, { status: 500 });
  }
}
