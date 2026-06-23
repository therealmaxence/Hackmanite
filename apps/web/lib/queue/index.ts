import { logger } from "@/lib/logger";
import { redis, RedisKeys, RedisTTL, clearSessionGraphCache } from "@/lib/redis";
import { ExtractionJobPayload, FileStatus, JobStatus } from "./types";
import { memoryQueue } from "./memoryQueue";
import { isRedisAvailable, bullQueue, activeControllers } from "./bullQueue";
import { prisma } from "@/lib/prisma";

export * from "./types";

const NLP_URL = process.env.NLP_SERVICE_URL || "http://localhost:8000";

const useBull = () => isRedisAvailable && bullQueue;
const mapBullJob = (status: FileStatus) => (j: any) => ({ id: j.id!, data: j.data as ExtractionJobPayload, status, entityCount: 0, error: null });

class UnifiedQueue {
  async add(data: ExtractionJobPayload, options?: { priority?: number }): Promise<{ id: string }> {
    if (useBull()) {
      const job = await bullQueue!.add("extract", data, { priority: options?.priority ?? 1 });
      return { id: job.id! };
    }
    return memoryQueue.add(data, options);
  }

  async getActive() {
    if (useBull()) return (await bullQueue!.getJobs(["active"])).map(mapBullJob("PROCESSING"));
    return memoryQueue.getActive();
  }

  async getPending() {
    if (useBull()) return (await bullQueue!.getJobs(["waiting", "paused", "delayed", "prioritized"])).map(mapBullJob("PENDING"));
    return memoryQueue.getPending();
  }

  async processMemoryQueue(): Promise<void> {
    if (!useBull()) await memoryQueue.processQueue();
  }
}

export const extractionQueue = new UnifiedQueue();

export async function cancelSessionExtraction(sessionId: string): Promise<string[]> {
  await redis.setex(RedisKeys.sessionCancellation(sessionId), RedisTTL.job, "1");
  const cancelledFileIds: string[] = [];

  if (useBull()) {
    const waiting = await bullQueue!.getJobs(["waiting", "paused", "delayed", "prioritized"]);
    const active = await bullQueue!.getJobs(["active"]);

    for (const job of waiting.filter((j) => j.data.sessionId === sessionId)) {
      if (job.id) { await job.remove(); if (job.data.fileId) cancelledFileIds.push(job.data.fileId); }
    }
    for (const job of active.filter((j) => j.data.sessionId === sessionId)) {
      if (job.id) {
        activeControllers.get(job.id)?.abort();
        await job.discard();
        await job.moveToFailed(new Error("Cancelled by user"), "0");
        if (job.data.fileId) cancelledFileIds.push(job.data.fileId);
      }
    }
  } else {
    const allJobs = [...await memoryQueue.getPending(), ...await memoryQueue.getActive()];
    for (const job of allJobs.filter((j) => j.data.sessionId === sessionId)) {
      if (job.data.fileId) cancelledFileIds.push(job.data.fileId);
      memoryQueue.removeJob(job.id);
    }
  }

  return cancelledFileIds;
}

export async function getJobStatus(jobId: string): Promise<JobStatus | null> {
  if (useBull()) {
    const job = await bullQueue!.getJob(jobId);
    if (!job) return null;
    const stateMap: Record<string, FileStatus> = { active: "PROCESSING", completed: "DONE", failed: "FAILED" };
    return {
      jobId: job.id!, fileId: job.data.fileId,
      status: stateMap[await job.getState()] ?? "PENDING",
      entityCount: job.returnvalue?.entityCount ?? 0,
      error: job.failedReason ?? null,
    };
  }
  const job = await memoryQueue.getJob(jobId);
  if (!job) return null;
  return { jobId: job.id, fileId: job.data.fileId, status: job.status, entityCount: job.entityCount, error: job.error };
}

export async function retryFile(fileId: string): Promise<void> {
  const file = await prisma.file.findUnique({ where: { id: fileId }, include: { session: true } });
  if (!file) throw new Error(`File not found: ${fileId}`);

  await redis.del(RedisKeys.sessionCancellation(file.sessionId));

  await prisma.$transaction(async (tx) => {
    await tx.occurrence.deleteMany({ where: { fileId } });
    await tx.entityNeighborhood.deleteMany({ where: { fileId } });
    await tx.email.deleteMany({ where: { fileId } });
    await tx.file.update({ where: { id: fileId }, data: { status: "PENDING", errorMessage: null, processedAt: null } });
  }, { maxWait: 15000, timeout: 30000 });

  try {
    const res = await fetch(`${NLP_URL}/graph/file/${fileId}`, { method: "DELETE" });
    if (!res.ok) logger.error(`Failed to delete file ${fileId} in KuzuDB, status: ${res.status}`);
  } catch (err: any) {
    logger.error("Failed to contact Python service for KuzuDB file delete:", { error: err.message });
  }

  await clearSessionGraphCache(file.sessionId);
  const priority = file.mimeType.startsWith("image/") || file.mimeType === "application/pdf" ? 10 : 1;
  await extractionQueue.add(
    { fileId: file.id, sessionId: file.sessionId, storagePath: file.storagePath, mimeType: file.mimeType, windowSize: file.session.windowSize },
    { priority }
  );
  logger.info("File re-enqueued for retry", { fileId, originalName: file.originalName });
}

export async function resumeStuckJobs(sessionId: string): Promise<number> {
  await redis.del(RedisKeys.sessionCancellation(sessionId));

  const stuckFiles = await prisma.file.findMany({
    where: { sessionId, status: { in: ["PENDING", "PROCESSING"] } },
    include: { session: true },
  });
  if (stuckFiles.length === 0) return 0;

  const queuedFileIds = new Set([
    ...(await extractionQueue.getActive()).map((j) => j.data.fileId),
    ...(await extractionQueue.getPending()).map((j) => j.data.fileId),
  ]);

  let resumedCount = 0;
  for (const file of stuckFiles) {
    if (queuedFileIds.has(file.id)) continue;

    if (file.status === "PROCESSING") {
      await prisma.$transaction(async (tx) => {
        await tx.occurrence.deleteMany({ where: { fileId: file.id } });
        await tx.entityNeighborhood.deleteMany({ where: { fileId: file.id } });
        await tx.email.deleteMany({ where: { fileId: file.id } });
        await tx.file.update({ where: { id: file.id }, data: { status: "PENDING", errorMessage: null, processedAt: null } });
      }, { maxWait: 15000, timeout: 30000 });

      try {
        await fetch(`${NLP_URL}/graph/file/${file.id}`, { method: "DELETE" });
      } catch (err: any) {
        logger.error("Failed KuzuDB clean during resume:", { error: err.message });
      }
    }

    const priority = file.mimeType.startsWith("image/") || file.mimeType === "application/pdf" ? 10 : 1;
    await extractionQueue.add(
      { fileId: file.id, sessionId: file.sessionId, storagePath: file.storagePath, mimeType: file.mimeType, windowSize: file.session.windowSize },
      { priority }
    );
    resumedCount++;
    logger.info("Stuck file resumed and re-enqueued", { fileId: file.id, originalName: file.originalName });
  }

  if (resumedCount > 0) await clearSessionGraphCache(sessionId);
  return resumedCount;
}
