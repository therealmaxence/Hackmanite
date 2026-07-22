import { NextRequest, NextResponse } from 'next/server';
import { ErrorCodes } from '@/types/api';
import { executePipelineDryRun } from '@/lib/pipeline/executor';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pipelineId } = await params;
    const { nodeId } = await req.json();

    if (!nodeId || typeof nodeId !== 'string') {
      return NextResponse.json(
        { error: 'nodeId is required', code: ErrorCodes.VALIDATION_ERROR },
        { status: 400 }
      );
    }

    logger.info(`[Pipeline] Dry-running pipeline ${pipelineId} up to node ${nodeId}...`);
    const output = await executePipelineDryRun(pipelineId, nodeId);

    return NextResponse.json(output);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Pipeline Dry Run Error:', { err });
    return NextResponse.json({ error: msg, code: ErrorCodes.INTERNAL_ERROR }, { status: 500 });
  }
}
