import { logger } from "@/lib/logger";
import { Queue, Worker } from "bullmq";
import Redis from "ioredis";
import { executeExtraction } from "./executor";

export let isRedisAvailable = false;
export let redisConnection: Redis | null = null;
export let bullQueue: Queue | null = null;
export let bullWorker: Worker | null = null;

export const activeControllers = new Map<string, AbortController>();

const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
const redisUrl = process.env.REDIS_URL;

if (redisUrl && !isBuildPhase) {
  logger.info("Initializing Redis connection for BullMQ...", { redisUrl });

  try {
    redisConnection = new Redis(redisUrl, {
      maxRetriesPerRequest: null, // Required by BullMQ
      connectTimeout: 2000,
      retryStrategy(times) {
        if (times > 3) {
          logger.warn("Redis is unreachable after 3 attempts. Disabling BullMQ and falling back to MemoryQueue permanently.");
          isRedisAvailable = false;
          return null; // Stop retrying permanently
        }
        return 1000; // Wait 1s between retries
      },
      reconnectOnError: (err) => {
        return false;
      }
    });

    redisConnection.on("error", (err) => {
      if (isRedisAvailable) {
        logger.warn("Redis connection error event", { error: err.message });
      }
    });

    redisConnection.on("connect", () => {
      isRedisAvailable = true;
      logger.info("Redis is connected. BullMQ Queue & Worker initialized.");
    });

    bullQueue = new Queue("extraction", {
      connection: redisConnection,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
      }
    });

    const concurrency = parseInt(process.env.BULL_EXTRACTION_CONCURRENCY || "5", 10);

    bullWorker = new Worker("extraction", async (job) => {
      const controller = new AbortController();
      activeControllers.set(job.id!, controller);
      try {
        return await executeExtraction(job.id!, job.data, controller);
      } finally {
        activeControllers.delete(job.id!);
      }
    }, {
      connection: redisConnection,
      concurrency,
    });

    bullWorker.on("failed", (job, err) => {
      logger.error("BullMQ extraction job failed", { jobId: job?.id, error: err.message });
    });

    bullWorker.on("completed", (job) => {
      logger.info("BullMQ extraction job completed", { jobId: job?.id });
    });

    isRedisAvailable = true;
  } catch (err: any) {
    logger.warn("Failed to initialize Redis client, using In-Memory fallback", { error: err.message });
    isRedisAvailable = false;
  }
} else {
  if (isBuildPhase) {
    logger.info("Bypassing Redis initialization for BullMQ during Next.js build phase.");
  } else {
    logger.warn("REDIS_URL not set — using In-Memory fallback for queue (not suitable for multi-process)");
  }
  isRedisAvailable = false;
}
