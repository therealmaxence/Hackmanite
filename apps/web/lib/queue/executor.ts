import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { cache, CacheKeys, CacheTTL, clearSessionGraphCache } from "@/lib/cache";
import { resolve } from "path";
import { uuid5 } from "@/lib/uuid5";
import { ExtractionJobPayload } from "./types";
import { recomputeSessionTfidf } from "@/lib/api/tfidf";
import { NLP_URL } from "@/lib/nlp-url";

const isSessionCancelled = async (sessionId: string) =>
  (await cache.get(CacheKeys.sessionCancellation(sessionId))) === "1";

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

export async function fetchNLPResult(
  fileId: string,
  storagePath: string,
  mimeType: string,
  windowSize: number | undefined,
  controller: AbortController,
  sessionId: string
): Promise<any> {
  let response: Response | undefined;
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      response = await fetch(`${NLP_URL}/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_id: fileId,
          storage_path: resolve(process.cwd(), storagePath),
          mime_type: mimeType,
          window_size: windowSize ?? 400,
        }),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(600_000)]),
      });

      if (await isSessionCancelled(sessionId)) throw new Error("Cancelled by user");
      if (response.ok || response.status < 500) break;
      throw new Error(`NLP service error ${response.status}: ${await response.text()}`);
    } catch (err: any) {
      lastError = err;
      if (controller.signal.aborted || err.name === "AbortError" || await isSessionCancelled(sessionId)) {
        throw new Error("Cancelled by user");
      }
      logger.warn(`Fetch attempt ${attempt} to NLP service failed: ${err.message}`);
      if (attempt < 3) await sleep(5000);
    }
  }

  if (!response) throw lastError || new Error("Failed to reach NLP service after 3 attempts");
  if (!response.ok) throw new Error(`NLP service error ${response.status}`);

  const result = await response.json();
  if (await isSessionCancelled(sessionId)) throw new Error("Cancelled by user");
  if (result.error) throw new Error(result.error);
  return result;
}

export async function saveExtractionToDatabase(fileId: string, result: any): Promise<number> {
  await prisma.$transaction(async (tx) => {
    const entityMap = new Map<string, { id: string; canonical: string; type: string }>();

    for (const entity of result.entities) {
      const canonical = entity.canonical.slice(0, 500);
      const displayName = entity.display_name.slice(0, 500);
      const stableId = uuid5(`${entity.type}:${canonical}`);
      let dbEntity;
      try {
        dbEntity = await tx.entity.upsert({
          where: { canonical_type: { canonical, type: entity.type } },
          create: { id: stableId, canonical, displayName, type: entity.type, metadata: entity.metadata ? JSON.stringify(entity.metadata) : "{}" },
          update: {},
        });
      } catch (error: any) {
        if (error.code === "P2002") {
          dbEntity = await tx.entity.findUnique({ where: { canonical_type: { canonical, type: entity.type } } });
          if (!dbEntity) throw error;
        } else {
          throw error;
        }
      }

      entityMap.set(`${canonical}:${entity.type}`, { id: dbEntity.id, canonical, type: entity.type });

      const excerpts = entity.excerpts ? JSON.stringify(entity.excerpts) : null;
      await tx.occurrence.upsert({
        where: { fileId_entityId: { fileId, entityId: dbEntity.id } },
        create: { entityId: dbEntity.id, fileId, count: entity.count, excerpts },
        update: { count: entity.count, excerpts },
      });
    }

    const neighborhoodBuckets = new Map<string, { weight: number; distance: number; snippet: string; sourceOffset: number; targetOffset: number }>();

    for (const nb of result.neighborhoods ?? []) {
      const source = entityMap.get(`${nb.source_canonical.slice(0, 500)}:${nb.source_type}`);
      const target = entityMap.get(`${nb.target_canonical.slice(0, 500)}:${nb.target_type}`);
      if (!source || !target || source.id === target.id) continue;

      const [se, te] = source.id < target.id ? [source, target] : [target, source];
      const isSwapped = source.id > target.id;
      const key = `${se.id}:${te.id}`;
      const existing = neighborhoodBuckets.get(key);
      if (!existing || nb.weight > existing.weight) {
        neighborhoodBuckets.set(key, {
          weight: nb.weight, distance: nb.distance, snippet: nb.snippet,
          sourceOffset: isSwapped ? nb.target_offset : nb.source_offset,
          targetOffset: isSwapped ? nb.source_offset : nb.target_offset,
        });
      }
    }

    for (const [pairKey, nb] of neighborhoodBuckets.entries()) {
      const [sourceEntityId, targetEntityId] = pairKey.split(":");
      await tx.entityNeighborhood.upsert({
        where: { fileId_sourceEntityId_targetEntityId: { fileId, sourceEntityId, targetEntityId } },
        create: { fileId, sourceEntityId, targetEntityId, weight: nb.weight, distance: nb.distance, snippet: nb.snippet, sourceOffset: nb.sourceOffset, targetOffset: nb.targetOffset },
        update: { weight: nb.weight, distance: nb.distance, snippet: nb.snippet, sourceOffset: nb.sourceOffset, targetOffset: nb.targetOffset },
      });
    }

    for (const email of result.emails ?? []) {
      try {
        const emailData = {
          fileId,
          inReplyTo: email.in_reply_to || null,
          references: email.references || null,
          subject: email.subject || "(No Subject)",
          from: email.from_address || "unknown@example.com",
          to: email.to_address || "unknown@example.com",
          cc: email.cc_address || null,
          date: email.date ? new Date(email.date) : null,
          body: email.body || "",
          attachments: email.attachments ? JSON.stringify(email.attachments) : "[]",
        };
        await tx.email.upsert({
          where: { messageId: email.message_id },
          create: { messageId: email.message_id, ...emailData },
          update: emailData,
        });
      } catch (error) {
        logger.error("Failed to upsert email record", { messageId: email.message_id, error });
      }
    }
  }, { maxWait: 30000, timeout: 60000 });

  return result.entities.length;
}

async function saveExtractionWithRetry(fileId: string, result: any, retries = 3, delay = 1000): Promise<number> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await saveExtractionToDatabase(fileId, result);
    } catch (error: any) {
      logger.warn(`Database save attempt ${attempt} failed for file ${fileId}: ${error.message}`);
      if (attempt === retries) throw error;
      await sleep(delay * Math.pow(2, attempt - 1));
    }
  }
  throw new Error("Failed to save extraction to database");
}

export async function executeExtraction(jobId: string, data: ExtractionJobPayload, controller: AbortController) {
  const { fileId, sessionId, storagePath, mimeType, windowSize } = data;
  logger.info("Processing extraction job", { jobId, fileId });

  try {
    if (await isSessionCancelled(sessionId)) throw new Error("Cancelled by user");

    await prisma.file.update({ where: { id: fileId }, data: { status: "PROCESSING" } });

    const result = await fetchNLPResult(fileId, storagePath, mimeType, windowSize, controller, sessionId);
    const entityCount = await saveExtractionWithRetry(fileId, result);

    await prisma.file.update({ where: { id: fileId }, data: { status: "DONE", processedAt: new Date() } });

    const remainingCount = await prisma.file.count({
      where: { sessionId, status: { in: ["PENDING", "PROCESSING"] } },
    });
    if (remainingCount === 0) await recomputeSessionTfidf(sessionId);

    await clearSessionGraphCache(sessionId);
    await cache.setex(CacheKeys.sessionFile(sessionId, fileId), CacheTTL.job, JSON.stringify({ status: "DONE", entityCount }));
    logger.info("Extraction complete", { jobId, fileId });
    return { entityCount };
  } catch (err: any) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Extraction job execution failed", { jobId, fileId, error: message });
    await prisma.file.update({ where: { id: fileId }, data: { status: "FAILED", errorMessage: message } });
    throw err;
  }
}
