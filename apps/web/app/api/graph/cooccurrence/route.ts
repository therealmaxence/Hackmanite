import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/types/api';

export const runtime = 'nodejs';

const cleanSnippet = (text: string) => text.replace(/^…+/, '').replace(/…+$/, '').trim();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');
  const nodeIdsParam = searchParams.get('nodeIds');

  if (!sessionId || !nodeIdsParam) {
    return NextResponse.json({ error: 'sessionId and nodeIds required', code: ErrorCodes.VALIDATION_ERROR }, { status: 400 });
  }

  try {
    const nodeIds = nodeIdsParam.split(',').filter(Boolean);
    if (!nodeIds.length) return NextResponse.json({ files: [] });

    const occurrences = await prisma.occurrence.findMany({
      where: { entityId: { in: nodeIds }, file: { sessionId } },
      select: { fileId: true, entityId: true, excerpts: true },
    });

    // Group by file, keep only files where all requested entities appear
    const fileOccMap = new Map<string, typeof occurrences>();
    for (const occ of occurrences) {
      const list = fileOccMap.get(occ.fileId) ?? [];
      list.push(occ);
      fileOccMap.set(occ.fileId, list);
    }
    const candidateFiles = [...fileOccMap.entries()]
      .filter(([, list]) => new Set(list.map((o) => o.entityId)).size === nodeIds.length)
      .map(([fileId, occs]) => ({ fileId, occurrences: occs }));

    if (!candidateFiles.length) return NextResponse.json({ files: [] });

    const [entities, files] = await Promise.all([
      prisma.entity.findMany({ where: { id: { in: nodeIds } }, select: { id: true, displayName: true, type: true } }),
      prisma.file.findMany({ where: { id: { in: candidateFiles.map((c) => c.fileId) } }, select: { id: true, originalName: true, mimeType: true, sizeBytes: true, processedAt: true } }),
    ]);

    const entityMap = new Map(entities.map((e) => [e.id, e]));
    const fileMap = new Map(files.map((f) => [f.id, f]));
    const resultFiles = [];

    for (const { fileId, occurrences: occs } of candidateFiles) {
      const file = fileMap.get(fileId);
      if (!file) continue;

      const allExcerpts: { text: string; offset: number; end: number; entityId: string; entityName: string; entityType: string }[] = [];
      for (const occ of occs) {
        const entityInfo = entityMap.get(occ.entityId);
        if (!entityInfo) continue;
        let parsedEx: any[] = [];
        try { parsedEx = occ.excerpts ? JSON.parse(occ.excerpts) : []; if (!Array.isArray(parsedEx)) parsedEx = []; } catch { /* ignore */ }
        for (const ex of parsedEx) {
          const text = typeof ex === 'string' ? ex : ex?.text || '';
          if (!text) continue;
          const offset = typeof ex?.offset === 'number' ? ex.offset : 0;
          allExcerpts.push({ text, offset, end: typeof ex?.end === 'number' ? ex.end : offset + text.length, entityId: occ.entityId, entityName: entityInfo.displayName, entityType: entityInfo.type });
        }
      }
      if (!allExcerpts.length) continue;

      allExcerpts.sort((a, b) => a.offset - b.offset);

      // Cluster excerpts by proximity
      const clusters: typeof allExcerpts[] = [];
      let cur: typeof allExcerpts = [];
      for (const ex of allExcerpts) {
        if (!cur.length || ex.offset - cur[cur.length - 1].offset <= 800) { cur.push(ex); }
        else { clusters.push(cur); cur = [ex]; }
      }
      if (cur.length) clusters.push(cur);

      const validClusters = clusters.filter((c) => new Set(c.map((ex) => ex.entityId)).size === nodeIds.length);
      if (!validClusters.length) continue;

      const mergedSnippets = validClusters.map((cluster) => {
        cluster.sort((a, b) => a.offset - b.offset);
        let merged = cleanSnippet(cluster[0].text);
        for (let i = 1; i < cluster.length; i++) {
          const next = cleanSnippet(cluster[i].text);
          if (merged.includes(next)) continue;
          let overlap = 0;
          for (let len = Math.min(merged.length, next.length); len >= 1; len--) {
            if (merged.slice(-len) === next.slice(0, len)) { overlap = len; break; }
          }
          merged += overlap > 0 ? next.slice(overlap) : ` ... ${next}`;
        }
        return merged;
      });

      resultFiles.push({ id: file.id, originalName: file.originalName, mimeType: file.mimeType, sizeBytes: Number(file.sizeBytes), processedAt: file.processedAt?.toISOString() ?? null, snippets: mergedSnippets });
    }

    return NextResponse.json({ files: resultFiles });
  } catch (err: any) {
    console.error('Cooccurrence API Error:', err);
    return NextResponse.json({ error: err.message || 'Unknown error', code: ErrorCodes.INTERNAL_ERROR }, { status: 500 });
  }
}
