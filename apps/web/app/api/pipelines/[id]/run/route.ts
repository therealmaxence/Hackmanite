import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/types/api';
import { isRedisAvailable, bullQueue } from '@/lib/queue/bullQueue';
import { executePipeline } from '@/lib/pipeline/executor';
import { SESSION_TTL_MS } from '@/lib/api/upload';
import { publishMessage } from '@/lib/pipeline/kafkaClient';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pipelineId } = await params;
    const body = await req.json().catch(() => ({}));
    let sessionId = typeof body.sessionId === 'string' && body.sessionId.trim() ? body.sessionId.trim() : undefined;

    const pipeline = await prisma.pipeline.findUnique({
      where: { id: pipelineId },
    });

    if (!pipeline) {
      return NextResponse.json(
        { error: 'Pipeline not found', code: ErrorCodes.NOT_FOUND },
        { status: 404 }
      );
    }

    const definition = JSON.parse(pipeline.definition);
    const needsGraphSession = (definition.nodes || []).some((node: any) => {
      const data = node.data || node;
      return data.type === 'output.kuzudb_write' && data.config?.confirmCommit;
    });
    if (sessionId || needsGraphSession) {
      const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
      const session = sessionId
        ? await prisma.session.upsert({ where: { id: sessionId }, update: { expiresAt }, create: { id: sessionId, expiresAt } })
        : await prisma.session.create({ data: { expiresAt } });
      sessionId = session.id;
    }

    const run = await prisma.pipelineRun.create({
      data: {
        pipelineId,
        status: 'PENDING',
        logs: 'Run initialized.\n',
        nodeStates: '{}',
      },
    });

    if (process.env.KAFKA_BOOTSTRAP_SERVERS) {
      await publishMessage('pipeline-start', { pipelineRunId: run.id, sessionId });
      console.log(`[Pipeline] Dispatched run ${run.id} to Kafka.`);
    } else if (isRedisAvailable && bullQueue) {
      await bullQueue.add('pipeline', { pipelineRunId: run.id, sessionId });
      console.log(`[Pipeline] Dispatched run ${run.id} to BullMQ.`);
    } else {
      Promise.resolve().then(async () => {
        try {
          await executePipeline(run.id, sessionId);
        } catch (err) {
          console.error(`In-memory execution failed for run ${run.id}:`, err);
        }
      });
      console.log(`[Pipeline] Dispatched run ${run.id} in-memory (async).`);
    }

    return NextResponse.json({ id: run.id, status: run.status, sessionId }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg, code: ErrorCodes.INTERNAL_ERROR }, { status: 500 });
  }
}
