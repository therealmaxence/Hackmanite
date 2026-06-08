import { logger } from "@/lib/logger";
import { redis, RedisKeys, RedisTTL, clearSessionGraphCache } from "@/lib/redis";
import { ExtractionJobPayload, FileStatus, JobStatus } from "./types";
import { memoryQueue } from "./memoryQueue";
import {
  isRedisAvailable,
  bullQueue,
  activeControllers,
} from "./bullQueue";
import { prisma } from "@/lib/prisma";

export * from "./types";

class UnifiedQueue {
  async add(data: ExtractionJobPayload, options?: { priority?: number }): Promise<{ id: string }> {
    if (isRedisAvailable && bullQueue) {
      const priority = options?.priority ?? 1;
      const job = await bullQueue.add("extract", data, { priority });
      return { id: job.id! };
    } else {
      return await memoryQueue.add(data, options);
    }
  }

  async getActive() {
    if (isRedisAvailable && bullQueue) {
      const active = await bullQueue.getJobs(["active"]);
      return active.map(j => ({
        id: j.id!,
        data: j.data as ExtractionJobPayload,
        status: "PROCESSING" as FileStatus,
        entityCount: 0,
        error: null,
      }));
    } else {
      return await memoryQueue.getActive();
    }
  }

  async getPending() {
    if (isRedisAvailable && bullQueue) {
      const pending = await bullQueue.getJobs(["waiting", "paused", "delayed", "prioritized"]);
      return pending.map(j => ({
        id: j.id!,
        data: j.data as ExtractionJobPayload,
        status: "PENDING" as FileStatus,
        entityCount: 0,
        error: null,
      }));
    } else {
      return await memoryQueue.getPending();
    }
  }
}

export const extractionQueue = new UnifiedQueue();

export async function cancelSessionExtraction(sessionId: string): Promise<string[]> {
  await redis.setex(RedisKeys.sessionCancellation(sessionId), RedisTTL.job, "1");

  const cancelledFileIds: string[] = [];

  if (isRedisAvailable && bullQueue) {
    const waiting = await bullQueue.getJobs(["waiting", "paused", "delayed", "prioritized"]);
    const active = await bullQueue.getJobs(["active"]);

    const sessionPending = waiting.filter(j => j.data.sessionId === sessionId);
    const sessionActive = active.filter(j => j.data.sessionId === sessionId);

    for (const job of sessionPending) {
      if (job.id) {
        await job.remove();
        if (job.data.fileId) cancelledFileIds.push(job.data.fileId);
      }
    }

    for (const job of sessionActive) {
      if (job.id) {
        const controller = activeControllers.get(job.id);
        if (controller) {
          controller.abort();
        }
        await job.discard();
        await job.moveToFailed(new Error("Cancelled by user"), "0");
        if (job.data.fileId) cancelledFileIds.push(job.data.fileId);
      }
    }
  } else {
    const pending = await memoryQueue.getPending();
    const active = await memoryQueue.getActive();

    const sessionPending = pending.filter(j => j.data.sessionId === sessionId);
    const sessionActive = active.filter(j => j.data.sessionId === sessionId);

    for (const job of sessionPending) {
      if (job.data.fileId) cancelledFileIds.push(job.data.fileId);
      memoryQueue.removeJob(job.id);
    }

    for (const job of sessionActive) {
      if (job.data.fileId) cancelledFileIds.push(job.data.fileId);
      memoryQueue.removeJob(job.id);
    }
  }

  return cancelledFileIds;
}

export async function getJobStatus(jobId: string): Promise<JobStatus | null> {
  if (isRedisAvailable && bullQueue) {
    const job = await bullQueue.getJob(jobId);
    if (!job) return null;

    const state = await job.getState();
    let status: FileStatus = "PENDING";
    if (state === "active") status = "PROCESSING";
    else if (state === "completed") status = "DONE";
    else if (state === "failed") status = "FAILED";

    const entityCount = job.returnvalue?.entityCount ?? 0;
    const error = job.failedReason ?? null;

    return {
      jobId: job.id!,
      fileId: job.data.fileId,
      status,
      entityCount,
      error,
    };
  } else {
    const job = memoryQueue.getJob(jobId);
    if (!job) return null;

    return {
      jobId: job.id,
      fileId: job.data.fileId,
      status: job.status,
      entityCount: job.entityCount,
      error: job.error,
    };
  }
}

export async function retryFile(fileId: string): Promise<void> {
  const file = await prisma.file.findUnique({
    where: { id: fileId },
    include: { session: true },
  });

  if (!file) {
    throw new Error(`File not found: ${fileId}`);
  }

  await prisma.$transaction([
    prisma.occurrence.deleteMany({ where: { fileId } }),
    prisma.entityNeighborhood.deleteMany({ where: { fileId } }),
    prisma.email.deleteMany({ where: { fileId } }),
    prisma.file.update({
      where: { id: fileId },
      data: {
        status: "PENDING",
        errorMessage: null,
        processedAt: null,
      },
    }),
  ]);

  try {
    const nlpUrl = process.env.NLP_SERVICE_URL || "http://localhost:8000";
    const res = await fetch(`${nlpUrl}/graph/file/${fileId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      logger.error(`Failed to delete file ${fileId} in KuzuDB, status: ${res.status}`);
    }
  } catch (err: any) {
    logger.error("Failed to contact Python service for KuzuDB file delete:", { error: err.message });
  }

  await clearSessionGraphCache(file.sessionId);

  const isSlow = file.mimeType.startsWith("image/") || file.mimeType === "application/pdf";
  const priority = isSlow ? 10 : 1;

  await extractionQueue.add(
    {
      fileId: file.id,
      sessionId: file.sessionId,
      storagePath: file.storagePath,
      mimeType: file.mimeType,
      windowSize: file.session.windowSize,
    },
    { priority }
  );

  logger.info("File re-enqueued for retry", { fileId, originalName: file.originalName });
}

export async function resumeStuckJobs(sessionId: string): Promise<number> {
  const stuckFiles = await prisma.file.findMany({
    where: {
      sessionId,
      status: { in: ["PENDING", "PROCESSING"] },
    },
    include: { session: true },
  });

  if (stuckFiles.length === 0) {
    return 0;
  }

  const active = await extractionQueue.getActive();
  const pending = await extractionQueue.getPending();

  const queuedFileIds = new Set([
    ...active.map((j) => j.data.fileId),
    ...pending.map((j) => j.data.fileId),
  ]);

  let resumedCount = 0;

  for (const file of stuckFiles) {
    if (!queuedFileIds.has(file.id)) {
      if (file.status === "PROCESSING") {
        await prisma.$transaction([
          prisma.occurrence.deleteMany({ where: { fileId: file.id } }),
          prisma.entityNeighborhood.deleteMany({ where: { fileId: file.id } }),
          prisma.email.deleteMany({ where: { fileId: file.id } }),
          prisma.file.update({
            where: { id: file.id },
            data: { status: "PENDING", errorMessage: null, processedAt: null },
          }),
        ]);

        try {
          const nlpUrl = process.env.NLP_SERVICE_URL || "http://localhost:8000";
          await fetch(`${nlpUrl}/graph/file/${file.id}`, { method: "DELETE" });
        } catch (err: any) {
          logger.error("Failed KuzuDB clean during resume:", { error: err.message });
        }
      }

      const isSlow = file.mimeType.startsWith("image/") || file.mimeType === "application/pdf";
      const priority = isSlow ? 10 : 1;

      await extractionQueue.add(
        {
          fileId: file.id,
          sessionId: file.sessionId,
          storagePath: file.storagePath,
          mimeType: file.mimeType,
          windowSize: file.session.windowSize,
        },
        { priority }
      );

      resumedCount++;
      logger.info("Stuck file resumed and re-enqueued", { fileId: file.id, originalName: file.originalName });
    }
  }

  if (resumedCount > 0) {
    await clearSessionGraphCache(sessionId);
  }

  return resumedCount;
}
