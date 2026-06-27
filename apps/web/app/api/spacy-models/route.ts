import { NextRequest, NextResponse } from 'next/server';
import { NLP_URL } from '@/lib/nlp-url';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const res = await fetch(`${NLP_URL}/spacy-models`);
    return NextResponse.json(await res.json());
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { action, model } = await req.json();
    const endpoint = action === 'download' ? 'download' : 'select';
    const res = await fetch(`${NLP_URL}/spacy-models/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model }),
    });
    return NextResponse.json(await res.json());
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
