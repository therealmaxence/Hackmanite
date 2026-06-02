import { NextRequest, NextResponse } from 'next/server';
import { ENTITY_COLORS } from '@/types/entities';
import type { EntityType } from '@/types/entities';
import { ErrorCodes } from '@/types/api';

export const runtime = 'nodejs';

const NLP_URL = process.env.NLP_SERVICE_URL || 'http://localhost:8000';

async function fetchNeighbors({
  nodeId,
  loadedIds,
}: {
  nodeId: string | null;
  loadedIds?: string | string[] | null;
}) {
  if (!nodeId) {
    throw new Error('nodeId required');
  }

  let loadedList: string[] = [];
  if (loadedIds) {
    if (Array.isArray(loadedIds)) {
      loadedList = loadedIds.filter(Boolean);
    } else {
      loadedList = loadedIds.split(',').filter(Boolean);
    }
  }

  // Talk to Python NLP service using POST to bypass Uvicorn/Kuzu URL size limits
  const upstream = await fetch(`${NLP_URL}/graph/neighbors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      node_id: nodeId,
      loaded_ids: loadedList,
    }),
    cache: 'no-store',
  });

  if (!upstream.ok) {
    throw new Error(`Upstream graph service error ${upstream.status}`);
  }

  const data = await upstream.json();

  const nodes = (data.nodes ?? [])
    .filter((n: any) => n.display_name && n.display_name.trim() !== '' && n.type && n.type.trim() !== '')
    .map(
      (n: { id: string; display_name: string; type: string; total_count: number; file_count: number }) => ({
        id: n.id,
        label: n.display_name,
        type: n.type as EntityType,
        fileCount: n.file_count,
        totalOccurrences: n.total_count,
        color: ENTITY_COLORS[n.type as EntityType] || '#6b7280',
      })
    );

  const edges = (data.edges ?? []).map(
    (e: { source: string; target: string; weight: number }) => ({
      source: e.source,
      target: e.target,
      weight: e.weight,
    })
  );

  return { nodes, edges };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const nodeId = searchParams.get('nodeId');
  const loadedIds = searchParams.get('loadedIds') || '';

  try {
    const result = await fetchNeighbors({ nodeId, loadedIds });
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: msg, code: ErrorCodes.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await fetchNeighbors({
      nodeId: body.nodeId,
      loadedIds: body.loadedIds,
    });
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: msg, code: ErrorCodes.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}
