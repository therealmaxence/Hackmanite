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

export async function POST(req: NextRequest) {
  try {
    let body = {};
    try {
      body = await req.json();
    } catch { /* ignore */ }
    const res = await fetch(`${NLP_URL}/tesseract/install`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return NextResponse.json(await res.json());
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
