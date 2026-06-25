import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ENTITY_COLORS } from '@/types/entities';
import type { EntityType } from '@/types/entities';
import { ErrorCodes } from '@/types/api';
import { NLP_URL } from '@/lib/nlp-url';

export const runtime = 'nodejs';

const mapNode = (n: { id: string; display_name: string; type: string; total_count: number; file_count: number; tfidf?: number }) => ({
  id: n.id, label: n.display_name, type: n.type as EntityType,
  fileCount: n.file_count, totalOccurrences: n.total_count, tfidf: n.tfidf ?? 0,
  color: ENTITY_COLORS[n.type as EntityType] || '#6b7280',
});

async function fetchNeighbors({ nodeId, loadedIds, sessionId }: { nodeId: string | null; loadedIds?: string | string[] | null; sessionId?: string | null }) {
  if (!nodeId) throw new Error('nodeId required');

  let hiddenIds = new Set<string>();
  if (sessionId) {
    const session = await prisma.session.findUnique({ where: { id: sessionId }, select: { hiddenNodeIds: true } });
    hiddenIds = new Set<string>(JSON.parse(session?.hiddenNodeIds || '[]'));
  }

  const loadedList = loadedIds
    ? (Array.isArray(loadedIds) ? loadedIds : loadedIds.split(',').filter(Boolean))
    : [];

  const upstream = await fetch(`${NLP_URL}/graph/neighbors`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ node_id: nodeId, loaded_ids: loadedList }), cache: 'no-store',
  });
  if (!upstream.ok) throw new Error(`Upstream graph service error ${upstream.status}`);

  const data = await upstream.json();
  return {
    nodes: (data.nodes ?? []).filter((n: any) => n.display_name?.trim() && n.type?.trim() && !hiddenIds.has(n.id)).map(mapNode),
    edges: (data.edges ?? []).filter((e: any) => !hiddenIds.has(e.source) && !hiddenIds.has(e.target))
      .map((e: any) => ({ source: e.source, target: e.target, weight: e.weight })),
  };
}

const errResponse = (err: unknown) => {
  const msg = err instanceof Error ? err.message : 'Unknown error';
  return NextResponse.json({ error: msg, code: ErrorCodes.INTERNAL_ERROR }, { status: 500 });
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  try {
    return NextResponse.json(await fetchNeighbors({ nodeId: searchParams.get('nodeId'), loadedIds: searchParams.get('loadedIds'), sessionId: searchParams.get('sessionId') }));
  } catch (err) { return errResponse(err); }
}

export async function POST(req: NextRequest) {
  try {
    const { nodeId, loadedIds, sessionId } = await req.json().catch(() => ({}));
    return NextResponse.json(await fetchNeighbors({ nodeId, loadedIds, sessionId }));
  } catch (err) { return errResponse(err); }
}
