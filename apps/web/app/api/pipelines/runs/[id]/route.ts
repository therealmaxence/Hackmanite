import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/types/api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function extractDownloads(logs: string[]) {
  const pattern = /Successfully wrote (JSON output|GraphML output|Obsidian vault) to: (.+)$/;
  return logs.flatMap((log) => {
    const match = log.match(pattern);
    if (!match?.[2]) return [];
    const path = match[2].trim();
    return [{ label: match[1], path, fileName: path.split(/[\\/]/).pop() || 'export.file' }];
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const run = await prisma.pipelineRun.findUnique({
      where: { id },
    });

    if (!run) {
      return NextResponse.json(
        { error: 'Pipeline run not found', code: ErrorCodes.NOT_FOUND },
        { status: 404 }
      );
    }

    const logs = run.logs ? run.logs.split('\n') : [];
    return NextResponse.json({
      id: run.id,
      pipelineId: run.pipelineId,
      status: run.status,
      error: run.error,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      nodeStates: run.nodeStates ? JSON.parse(run.nodeStates) : {},
      logs,
      downloads: extractDownloads(logs),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg, code: ErrorCodes.INTERNAL_ERROR }, { status: 500 });
  }
}
