import { NextRequest, NextResponse } from 'next/server';
import { ErrorCodes } from '@/types/api';
import { parseGraphML } from '@/lib/graphml';
import { replaceSessionWithGraph } from '@/lib/api/graph-import';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const sessionId = formData.get('sessionId') as string | null;
    if (!file || typeof file.text !== 'function') {
      return NextResponse.json({ error: 'GraphML file is required.', code: ErrorCodes.VALIDATION_ERROR }, { status: 400 });
    }

    const graph = parseGraphML(await file.text(), {
      fileName: file.name || 'graphml-import.graphml',
      sourceFileId: `graphml:${file.name || Date.now()}`,
      mimeType: file.type || 'application/graphml+xml',
    });
    if (!graph.nodes.length) {
      return NextResponse.json({ error: 'No GraphML nodes found.', code: ErrorCodes.VALIDATION_ERROR }, { status: 400 });
    }

    const result = await replaceSessionWithGraph({ sessionId: sessionId || undefined, ...graph, windowSize: 400 });
    return NextResponse.json({ ...result, nodesImported: graph.nodes.length, edgesImported: graph.edges.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg, code: ErrorCodes.INTERNAL_ERROR }, { status: 500 });
  }
}
