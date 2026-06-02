import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { redis, RedisKeys, RedisTTL, clearSessionGraphCache } from "@/lib/redis";
import { resolve } from "path";
import { uuid5 } from "@/lib/uuid5";
import { ExtractionJobPayload } from "./types";

async function isSessionCancelled(sessionId: string): Promise<boolean> {
  return (await redis.get(RedisKeys.sessionCancellation(sessionId))) === "1";
}

export async function fetchNLPResult(
  fileId: string,
  storagePath: string,
  mimeType: string,
  windowSize: number | undefined,
  controller: AbortController,
  sessionId: string
): Promise<any> {
  const nlpUrl = process.env.NLP_SERVICE_URL || "http://localhost:8000";
  let response;
  let lastError;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      response = await fetch(`${nlpUrl}/extract`, {
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

      if (await isSessionCancelled(sessionId)) {
        throw new Error("Cancelled by user");
      }

      if (response.ok) {
        break;
      } else if (response.status >= 500) {
        throw new Error(`NLP service error ${response.status}: ${await response.text()}`);
      } else {
        break;
      }
    } catch (err: any) {
      lastError = err;
      if (controller.signal.aborted || err.name === "AbortError" || (await isSessionCancelled(sessionId))) {
        throw new Error("Cancelled by user");
      }
      logger.warn(`Fetch attempt ${attempt} to NLP service failed: ${err.message}`);
      if (attempt < 3) {
        await new Promise(res => setTimeout(res, 5000));
      }
    }
  }

  if (!response) {
    throw lastError || new Error("Failed to reach NLP service after 3 attempts");
  }

  if (!response.ok) {
    throw new Error(`NLP service error ${response.status}`);
  }

  const result = await response.json();

  if (await isSessionCancelled(sessionId)) {
    throw new Error("Cancelled by user");
  }

  if (result.error) {
    throw new Error(result.error);
  }

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
          where: {
            canonical_type: {
              canonical: canonical,
              type: entity.type,
            },
          },
          create: {
            id: stableId,
            canonical: canonical,
            displayName: displayName,
            type: entity.type,
            metadata: entity.metadata ? JSON.stringify(entity.metadata) : "{}",
          },
          update: {},
        });
      } catch (error: any) {
        if (error.code === 'P2002') {
          dbEntity = await tx.entity.findUnique({
            where: {
              canonical_type: {
                canonical: canonical,
                type: entity.type,
              },
            },
          });
          if (!dbEntity) throw error;
        } else {
          throw error;
        }
      }

      entityMap.set(`${canonical}:${entity.type}`, {
        id: dbEntity.id,
        canonical: canonical,
        type: entity.type,
      });

      await tx.occurrence.upsert({
        where: {
          fileId_entityId: {
            fileId,
            entityId: dbEntity.id,
          },
        },
        create: {
          entityId: dbEntity.id,
          fileId,
          count: entity.count,
          excerpts: entity.excerpts ? JSON.stringify(entity.excerpts) : null,
        },
        update: {
          count: entity.count,
          excerpts: entity.excerpts ? JSON.stringify(entity.excerpts) : null,
        },
      });
    }

    const neighborhoodBuckets = new Map<
      string,
      {
        weight: number;
        distance: number;
        snippet: string;
        sourceOffset: number;
        targetOffset: number;
      }
    >();

    for (const neighborhood of result.neighborhoods ?? []) {
      const sourceCanonical = neighborhood.source_canonical.slice(0, 500);
      const targetCanonical = neighborhood.target_canonical.slice(0, 500);
      const source = entityMap.get(`${sourceCanonical}:${neighborhood.source_type}`);
      const target = entityMap.get(`${targetCanonical}:${neighborhood.target_type}`);

      if (!source || !target || source.id === target.id) {
        continue;
      }

      const [sourceEntity, targetEntity] = source.id < target.id ? [source, target] : [target, source];
      const isSwapped = source.id > target.id;
      const key = `${sourceEntity.id}:${targetEntity.id}`;

      const existing = neighborhoodBuckets.get(key);
      if (!existing || neighborhood.weight > existing.weight) {
        neighborhoodBuckets.set(key, {
          weight: neighborhood.weight,
          distance: neighborhood.distance,
          snippet: neighborhood.snippet,
          sourceOffset: isSwapped ? neighborhood.target_offset : neighborhood.source_offset,
          targetOffset: isSwapped ? neighborhood.source_offset : neighborhood.target_offset,
        });
      }
    }

    for (const [pairKey, neighborhood] of Array.from(neighborhoodBuckets.entries())) {
      const [sourceEntityId, targetEntityId] = pairKey.split(':');

      await tx.entityNeighborhood.upsert({
        where: {
          fileId_sourceEntityId_targetEntityId: {
            fileId,
            sourceEntityId,
            targetEntityId,
          },
        },
        create: {
          fileId,
          sourceEntityId,
          targetEntityId,
          weight: neighborhood.weight,
          distance: neighborhood.distance,
          snippet: neighborhood.snippet,
          sourceOffset: neighborhood.sourceOffset,
          targetOffset: neighborhood.targetOffset,
        },
        update: {
          weight: neighborhood.weight,
          distance: neighborhood.distance,
          snippet: neighborhood.snippet,
          sourceOffset: neighborhood.sourceOffset,
          targetOffset: neighborhood.targetOffset,
        },
      });
    }

    // Write parsed email records
    for (const email of result.emails ?? []) {
      try {
        await tx.email.upsert({
          where: { messageId: email.message_id },
          create: {
            fileId,
            messageId: email.message_id,
            inReplyTo: email.in_reply_to || null,
            references: email.references || null,
            subject: email.subject || "(No Subject)",
            from: email.from_address || "unknown@example.com",
            to: email.to_address || "unknown@example.com",
            cc: email.cc_address || null,
            date: email.date ? new Date(email.date) : null,
            body: email.body || "",
            attachments: email.attachments ? JSON.stringify(email.attachments) : "[]",
          },
          update: {
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
          },
        });
      } catch (error) {
        logger.error("Failed to upsert email record", { messageId: email.message_id, error });
      }
    }
  }, {
    timeout: 60000,
  });

  return result.entities.length;
}

export async function executeExtraction(jobId: string, data: ExtractionJobPayload, controller: AbortController) {
  const { fileId, sessionId, storagePath, mimeType, windowSize } = data;
  logger.info("Processing extraction job", { jobId, fileId });

  if (await isSessionCancelled(sessionId)) {
    throw new Error("Cancelled by user");
  }

  // Mark file as PROCESSING
  await prisma.file.update({
    where: { id: fileId },
    data: { status: "PROCESSING" },
  });

  // Call Python NLP service (with HTTP retry logic)
  const result = await fetchNLPResult(fileId, storagePath, mimeType, windowSize, controller, sessionId);

  // Write entities, occurrences, neighborhoods, and emails to SQLite in a single transaction
  const entityCount = await saveExtractionToDatabase(fileId, result);

  await prisma.file.update({
    where: { id: fileId },
    data: { status: "DONE", processedAt: new Date() },
  });

  await clearSessionGraphCache(sessionId);

  await redis.setex(
    RedisKeys.sessionFile(sessionId, fileId),
    RedisTTL.job,
    JSON.stringify({ status: "DONE", entityCount })
  );

  logger.info("Extraction complete", { jobId, fileId });
  return { entityCount };
}
