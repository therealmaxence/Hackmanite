import { NextRequest, NextResponse } from 'next/server';
import { getJobStatus } from '@/lib/queue';
import { ErrorCodes } from '@/types/api';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const status = await getJobStatus(jobId);

    if (!status)
      return NextResponse.json({ error: 'Job not found', code: ErrorCodes.NOT_FOUND }, { status: 404 });

    return NextResponse.json(status);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg, code: ErrorCodes.INTERNAL_ERROR }, { status: 500 });
  }
}
