import { NextRequest, NextResponse } from 'next/server';
import { ENTITY_COLORS } from '@/types/entities';
import type { EntityType } from '@/types/entities';
import { ErrorCodes } from '@/types/api';

export const runtime = 'nodejs';

const NLP_URL = process.env.NLP_SERVICE_URL || 'http://localhost:8000';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const nodeId = searchParams.get('nodeId');
  const loadedIds = searchParams.get('loadedIds') || '';

  if (!nodeId) {
    return NextResponse.json(
      { error: 'nodeId required', code: ErrorCodes.VALIDATION_ERROR },
      { status: 400 }
    );
  }

  try {
    const params = new URLSearchParams({ node_id: nodeId });
    if (loadedIds) params.set('loaded_ids', loadedIds);

    const upstream = await fetch(`${NLP_URL}/graph/neighbors?${params}`, { cache: 'no-store' });
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

    return NextResponse.json({ nodes, edges });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: msg, code: ErrorCodes.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}
