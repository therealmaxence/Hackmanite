import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/types/api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const pipelines = await prisma.pipeline.findMany({
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(pipelines);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg, code: ErrorCodes.INTERNAL_ERROR }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, definition } = await req.json();

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Name is required and must be a string', code: ErrorCodes.VALIDATION_ERROR },
        { status: 400 }
      );
    }

    if (!definition || typeof definition !== 'string') {
      return NextResponse.json(
        { error: 'Definition JSON string is required', code: ErrorCodes.VALIDATION_ERROR },
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

    const pipeline = await prisma.pipeline.create({
      data: {
        name,
        definition,
      },
    });

    return NextResponse.json(pipeline, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg, code: ErrorCodes.INTERNAL_ERROR }, { status: 500 });
  }
}
