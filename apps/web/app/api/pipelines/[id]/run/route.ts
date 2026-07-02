import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/types/api';
import { isRedisAvailable, bullQueue } from '@/lib/queue/bullQueue';
import { executePipeline } from '@/lib/pipeline/executor';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pipelineId } = await params;

    const pipeline = await prisma.pipeline.findUnique({
      where: { id: pipelineId },
    });

    if (!pipeline) {
      return NextResponse.json(
        { error: 'Pipeline not found', code: ErrorCodes.NOT_FOUND },
        { status: 404 }
      );
    }

    // Create the pipeline run in database
    const run = await prisma.pipelineRun.create({
      data: {
        pipelineId,
        status: 'PENDING',
        logs: 'Run initialized.\n',
        nodeStates: '{}',
      },
    });

    // Queue or run the job
    if (isRedisAvailable && bullQueue) {
      await bullQueue.add('pipeline', { pipelineRunId: run.id });
      console.log(`[Pipeline] Dispatched run ${run.id} to BullMQ.`);
    } else {
      // Async in-memory run
      Promise.resolve().then(async () => {
        try {
          await executePipeline(run.id);
        } catch (err) {
          console.error(`In-memory execution failed for run ${run.id}:`, err);
        }
      });
      console.log(`[Pipeline] Dispatched run ${run.id} in-memory (async).`);
    }

    return NextResponse.json({ id: run.id, status: run.status }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg, code: ErrorCodes.INTERNAL_ERROR }, { status: 500 });
  }
}
