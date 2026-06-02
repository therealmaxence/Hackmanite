import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/types/api';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const querySessionId = searchParams.get('sessionId');

  const sessionId = querySessionId;
  if (!sessionId) {
    return NextResponse.json(
      { error: 'sessionId required', code: ErrorCodes.VALIDATION_ERROR },
      { status: 400 }
    );
  }

  try {
    const files = await prisma.file.findMany({
      where: { sessionId },
      select: { id: true, originalName: true },
    });

    const fileIds = files.map(f => f.id);

    let documentSimilarity = {
      files: [] as any[],
      matrix: [] as number[][],
    };

    if (fileIds.length > 0) {
      const occurrences = await prisma.occurrence.findMany({
        where: { fileId: { in: fileIds } },
        select: { entityId: true, fileId: true },
      });

      const fileEntitiesMap = new Map<string, Set<string>>();
      for (const occ of occurrences) {
        const bucket = fileEntitiesMap.get(occ.fileId) ?? new Set<string>();
        bucket.add(occ.entityId);
        fileEntitiesMap.set(occ.fileId, bucket);
      }

      const fileSimilarityList = files.map(f => ({
        id: f.id,
        name: f.originalName,
      }));

      const similarityMatrix: number[][] = [];
      for (let i = 0; i < files.length; i++) {
        similarityMatrix[i] = [];
        const setA = fileEntitiesMap.get(files[i].id) ?? new Set<string>();
        for (let j = 0; j < files.length; j++) {
          if (i === j) {
            similarityMatrix[i][j] = 1.0;
            continue;
          }
          const setB = fileEntitiesMap.get(files[j].id) ?? new Set<string>();
          let intersect = 0;
          for (const entId of setA) {
            if (setB.has(entId)) intersect++;
          }
          const union = setA.size + setB.size - intersect;
          const similarity = union > 0 ? intersect / union : 0.0;
          similarityMatrix[i][j] = parseFloat(similarity.toFixed(4));
        }
      }

      documentSimilarity = {
        files: fileSimilarityList,
        matrix: similarityMatrix,
      };
    }

    return NextResponse.json(documentSimilarity);
  } catch (err: unknown) {
    console.error('Similarity API Error:', err);
    return NextResponse.json(
      { error: 'Internal Server Error', code: ErrorCodes.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}
