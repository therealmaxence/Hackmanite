import { logger } from "@/lib/logger";
import { cache, CacheKeys, CacheTTL, clearSessionGraphCache } from "@/lib/cache";
import { ExtractionJobPayload, FileStatus, JobStatus } from "./types";
import { memoryQueue } from "./memoryQueue";
import { prisma } from "@/lib/prisma";
import { NLP_URL } from "@/lib/nlp-url";
import { publishMessage } from "../pipeline/kafkaClient";

export * from "./types";

async function resetFileToPending(fileId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.occurrence.deleteMany({ where: { fileId } });
    await tx.entityNeighborhood.deleteMany({ where: { fileId } });
    await tx.email.deleteMany({ where: { fileId } });
    await tx.file.update({ where: { id: fileId }, data: { status: "PENDING", errorMessage: null, processedAt: null } });
  }, { maxWait: 15000, timeout: 30000 });
  try {
    await fetch(`${NLP_URL}/graph/file/${fileId}`, { method: "DELETE" });
  } catch (err: any) {
    logger.error("Failed KuzuDB clean during reset:", { error: err.message });
  }
}

class UnifiedQueue {
  async add(data: ExtractionJobPayload, options?: { priority?: number }): Promise<{ id: string }> {
    if (process.env.KAFKA_BOOTSTRAP_SERVERS) {
      const jobId = `kafka-${data.fileId}`;
      await publishMessage("document-extraction", data);
      return { id: jobId };
    }
    return memoryQueue.add(data, options);
  }

  async getActive() {
    if (process.env.KAFKA_BOOTSTRAP_SERVERS) {
      const files = await prisma.file.findMany({ where: { status: "PROCESSING" } });
      return files.map(f => ({
        id: `kafka-${f.id}`,
        data: { fileId: f.id, sessionId: f.sessionId, storagePath: f.storagePath, mimeType: f.mimeType, windowSize: 400 },
        status: "PROCESSING" as FileStatus,
        entityCount: 0,
        error: null
      }));
    }
    return memoryQueue.getActive();
  }

  async getPending() {
    if (process.env.KAFKA_BOOTSTRAP_SERVERS) {
      const files = await prisma.file.findMany({ where: { status: "PENDING" } });
      return files.map(f => ({
        id: `kafka-${f.id}`,
        data: { fileId: f.id, sessionId: f.sessionId, storagePath: f.storagePath, mimeType: f.mimeType, windowSize: 400 },
        status: "PENDING" as FileStatus,
        entityCount: 0,
        error: null
      }));
    }
    return memoryQueue.getPending();
  }

  async processMemoryQueue(): Promise<void> {
    if (!process.env.KAFKA_BOOTSTRAP_SERVERS) {
      await memoryQueue.processQueue();
    }
  }
}

export const extractionQueue = new UnifiedQueue();

export async function cancelSessionExtraction(sessionId: string): Promise<number> {
  await cache.setex(CacheKeys.sessionCancellation(sessionId), CacheTTL.job, "1");

  if (process.env.KAFKA_BOOTSTRAP_SERVERS) {
    const pendingFiles = await prisma.file.findMany({ where: { sessionId, status: "PENDING" } });
    await Promise.all(pendingFiles.map((f) =>
      prisma.file.update({ where: { id: f.id }, data: { status: "FAILED", errorMessage: "Cancelled by user" } })
    ));
    return pendingFiles.length;
  }

  const allJobs = [...await memoryQueue.getPending(), ...await memoryQueue.getActive()];
  const sessionJobs = allJobs.filter((j) => j.data.sessionId === sessionId);
  const fileIds = sessionJobs.map((j) => j.data.fileId).filter(Boolean);

  for (const job of sessionJobs) memoryQueue.removeJob(job.id);

  if (fileIds.length > 0) {
    await prisma.file.updateMany({
      where: { id: { in: fileIds } },
      data: { status: "FAILED", errorMessage: "Cancelled by user" },
    });
  }

  return fileIds.length;
}


export async function getJobStatus(jobId: string): Promise<JobStatus | null> {
  if (process.env.KAFKA_BOOTSTRAP_SERVERS) {
    const fileId = jobId.replace(/^kafka-/, "");
    const file = await prisma.file.findUnique({ where: { id: fileId } });
    if (!file) return null;
    return {
      jobId,
      fileId: file.id,
      status: file.status as FileStatus,
      entityCount: 0,
      error: file.errorMessage
    };
  }
  const job = await memoryQueue.getJob(jobId);
  if (!job) return null;
  return { jobId: job.id, fileId: job.data.fileId, status: job.status, entityCount: job.entityCount, error: job.error };
}

export async function retryFile(fileId: string): Promise<void> {
  const file = await prisma.file.findUnique({ where: { id: fileId }, include: { session: true } });
  if (!file) throw new Error(`File not found: ${fileId}`);

  await cache.del(CacheKeys.sessionCancellation(file.sessionId));

  await resetFileToPending(fileId);

  await clearSessionGraphCache(file.sessionId);
  const priority = file.mimeType.startsWith("image/") || file.mimeType === "application/pdf" ? 10 : 1;
  await extractionQueue.add(
    { fileId: file.id, sessionId: file.sessionId, storagePath: file.storagePath, mimeType: file.mimeType, windowSize: file.session.windowSize },
    { priority }
  );
  logger.info("File re-enqueued for retry", { fileId, originalName: file.originalName });
}

export async function resumeStuckJobs(sessionId: string): Promise<number> {
  await cache.del(CacheKeys.sessionCancellation(sessionId));

  const stuckFiles = await prisma.file.findMany({
    where: { sessionId, status: { in: ["PENDING", "PROCESSING"] } },
    include: { session: true },
  });
  if (stuckFiles.length === 0) return 0;

  const queuedFileIds = new Set(
    process.env.KAFKA_BOOTSTRAP_SERVERS
      ? []
      : [
          ...(await extractionQueue.getActive()).map((j) => j.data.fileId),
          ...(await extractionQueue.getPending()).map((j) => j.data.fileId),
        ]
  );

  let resumedCount = 0;
  for (const file of stuckFiles) {
    if (queuedFileIds.has(file.id)) continue;

    if (file.status === "PROCESSING") {
      await resetFileToPending(file.id);
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
