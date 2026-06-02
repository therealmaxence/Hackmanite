import { logger } from "@/lib/logger";
import { redis, RedisKeys, RedisTTL } from "@/lib/redis";
import { ExtractionJobPayload, FileStatus, JobStatus } from "./types";
import { memoryQueue } from "./memoryQueue";
import {
  isRedisAvailable,
  bullQueue,
  activeControllers,
} from "./bullQueue";

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
      const pending = await bullQueue.getJobs(["waiting", "paused", "delayed"]);
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
    const waiting = await bullQueue.getJobs(["waiting", "paused", "delayed"]);
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
      job.status = "FAILED";
      job.error = "Cancelled by user";
      if (job.data.fileId) cancelledFileIds.push(job.data.fileId);
    }

    for (const job of sessionActive) {
      memoryQueue.abortJob(job.id);
      job.status = "FAILED";
      job.error = "Cancelled by user";
      if (job.data.fileId) cancelledFileIds.push(job.data.fileId);
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
