import { NextRequest, NextResponse } from 'next/server';
import { NLP_URL } from '@/lib/nlp-url';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const res = await fetch(`${NLP_URL}/tesseract/status`);
    return NextResponse.json(await res.json());
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(_req: NextRequest) {
  try {
    const res = await fetch(`${NLP_URL}/tesseract/install`, { method: 'POST' });
    return NextResponse.json(await res.json());
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
