import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/types/api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pipeline = await prisma.pipeline.findUnique({
      where: { id },
      include: {
        runs: {
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!pipeline) {
      return NextResponse.json(
        { error: 'Pipeline not found', code: ErrorCodes.NOT_FOUND },
        { status: 404 }
      );
    }

    return NextResponse.json(pipeline);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg, code: ErrorCodes.INTERNAL_ERROR }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { name, definition } = await req.json();

    const data: Record<string, any> = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || !name) {
        return NextResponse.json(
          { error: 'Name must be a non-empty string', code: ErrorCodes.VALIDATION_ERROR },
          { status: 400 }
        );
      }
      data.name = name;
    }

    if (definition !== undefined) {
      if (typeof definition !== 'string') {
        return NextResponse.json(
          { error: 'Definition must be a JSON string', code: ErrorCodes.VALIDATION_ERROR },
          { status: 400 }
        );
      }
      try {
        JSON.parse(definition);
      } catch {
        return NextResponse.json(
          { error: 'Definition must be a valid JSON string', code: ErrorCodes.VALIDATION_ERROR },
          { status: 400 }
        );
      }
      data.definition = definition;
    }

    const exists = await prisma.pipeline.findUnique({ where: { id } });
    if (!exists) {
      return NextResponse.json(
        { error: 'Pipeline not found', code: ErrorCodes.NOT_FOUND },
        { status: 404 }
      );
    }

    const updated = await prisma.pipeline.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg, code: ErrorCodes.INTERNAL_ERROR }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const exists = await prisma.pipeline.findUnique({ where: { id } });
    if (!exists) {
      return NextResponse.json(
        { error: 'Pipeline not found', code: ErrorCodes.NOT_FOUND },
        { status: 404 }
      );
    }

    await prisma.pipeline.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg, code: ErrorCodes.INTERNAL_ERROR }, { status: 500 });
  }
}
