import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/types/api';

export const runtime = 'nodejs';

function cleanSnippetText(text: string): string {
  return text.replace(/^…+/, '').replace(/…+$/, '').trim();
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');
  const nodeIdsParam = searchParams.get('nodeIds');

  if (!sessionId || !nodeIdsParam) {
    return NextResponse.json(
      { error: 'sessionId and nodeIds required', code: ErrorCodes.VALIDATION_ERROR },
      { status: 400 }
    );
  }

  try {
    const nodeIds = nodeIdsParam.split(',').filter(Boolean);
    if (nodeIds.length === 0) {
      return NextResponse.json({ files: [] });
    }

    const occurrences = await prisma.occurrence.findMany({
      where: {
        entityId: { in: nodeIds },
        file: { sessionId },
      },
      select: {
        fileId: true,
        entityId: true,
        excerpts: true,
      },
    });

    const fileOccMap = new Map<string, typeof occurrences>();
    for (const occ of occurrences) {
      const list = fileOccMap.get(occ.fileId) || [];
      list.push(occ);
      fileOccMap.set(occ.fileId, list);
    }

    const candidateFiles: { fileId: string; occurrences: typeof occurrences }[] = [];
    for (const [fileId, list] of fileOccMap.entries()) {
      const uniqueEntities = new Set(list.map((o) => o.entityId));
      if (uniqueEntities.size === nodeIds.length) {
        candidateFiles.push({ fileId, occurrences: list });
      }
    }

    if (candidateFiles.length === 0) {
      return NextResponse.json({ files: [] });
    }

    const [entities, files] = await Promise.all([
      prisma.entity.findMany({
        where: { id: { in: nodeIds } },
        select: { id: true, displayName: true, type: true },
      }),
      prisma.file.findMany({
        where: { id: { in: candidateFiles.map((c) => c.fileId) } },
        select: { id: true, originalName: true, mimeType: true, sizeBytes: true, processedAt: true },
      }),
    ]);

    const entityMap = new Map(entities.map((e) => [e.id, e]));
    const fileMap = new Map(files.map((f) => [f.id, f]));
    const resultFiles = [];

    for (const cand of candidateFiles) {
      const file = fileMap.get(cand.fileId);
      if (!file) continue;

      const allExcerpts: Array<{
        text: string;
        offset: number;
        end: number;
        entityId: string;
        entityName: string;
        entityType: string;
      }> = [];

      for (const occ of cand.occurrences) {
        const entityInfo = entityMap.get(occ.entityId);
        if (!entityInfo) continue;

        let parsedEx: any[] = [];
        try {
          parsedEx = occ.excerpts ? JSON.parse(occ.excerpts) : [];
          if (!Array.isArray(parsedEx)) parsedEx = [];
        } catch (e) {
          console.error(e);
        }

        for (const ex of parsedEx) {
          let text = '';
          let offset = 0;
          let end = 0;

          if (typeof ex === 'string') {
            text = ex;
          } else if (ex && typeof ex === 'object') {
            text = ex.text || '';
            offset = typeof ex.offset === 'number' ? ex.offset : 0;
            end = typeof ex.end === 'number' ? ex.end : offset + text.length;
          }

          if (!text) continue;

          allExcerpts.push({
            text,
            offset,
            end,
            entityId: occ.entityId,
            entityName: entityInfo.displayName,
            entityType: entityInfo.type,
          });
        }
      }

      if (allExcerpts.length === 0) continue;

      allExcerpts.sort((a, b) => a.offset - b.offset);

      const clusters: typeof allExcerpts[] = [];
      let currentCluster: typeof allExcerpts = [];

      for (const ex of allExcerpts) {
        if (currentCluster.length === 0) {
          currentCluster.push(ex);
        } else {
          const prev = currentCluster[currentCluster.length - 1];
          const gap = ex.offset - prev.offset;
          if (gap <= 800) {
            currentCluster.push(ex);
          } else {
            clusters.push(currentCluster);
            currentCluster = [ex];
          }
        }
      }
      if (currentCluster.length > 0) {
        clusters.push(currentCluster);
      }

      const validClusters = clusters.filter((cluster) => {
        const uniqueInCluster = new Set(cluster.map((ex) => ex.entityId));
        return uniqueInCluster.size === nodeIds.length;
      });

      if (validClusters.length === 0) continue;

      const mergedSnippets = validClusters.map((cluster) => {
        cluster.sort((a, b) => a.offset - b.offset);
        let mergedText = cleanSnippetText(cluster[0].text);

        for (let i = 1; i < cluster.length; i++) {
          const nextText = cleanSnippetText(cluster[i].text);
          if (mergedText.includes(nextText)) {
            continue;
          }

          let overlapLength = 0;
          const maxOverlap = Math.min(mergedText.length, nextText.length);
          for (let len = maxOverlap; len >= 1; len--) {
            const suffix = mergedText.slice(-len);
            const prefix = nextText.slice(0, len);
            if (suffix === prefix) {
              overlapLength = len;
              break;
            }
          }

          if (overlapLength > 0) {
            mergedText = mergedText + nextText.slice(overlapLength);
          } else {
            mergedText = mergedText + ' ... ' + nextText;
          }
        }

        return mergedText;
      });

      resultFiles.push({
        id: file.id,
        originalName: file.originalName,
        mimeType: file.mimeType,
        sizeBytes: Number(file.sizeBytes),
        processedAt: file.processedAt ? file.processedAt.toISOString() : null,
        snippets: mergedSnippets,
      });
    }

    return NextResponse.json({ files: resultFiles });
  } catch (err: any) {
    console.error('Cooccurrence API Error:', err);
    return NextResponse.json(
      { error: err.message || 'Unknown error', code: ErrorCodes.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}
