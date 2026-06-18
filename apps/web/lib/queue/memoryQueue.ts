import { prisma } from "@/lib/prisma";
import { ExtractionJobPayload, FileStatus } from "./types";
import { executeExtraction } from "./executor";
import { logger } from "@/lib/logger";

export class SQLiteQueue {
  private isProcessing = false;
  private activeControllers = new Map<string, AbortController>();

  async add(data: ExtractionJobPayload, options?: { priority?: number }): Promise<{ id: string }> {
    this.processQueue().catch((err) => logger.error("Failed to process queue in add", { error: err.message }));
    return { id: data.fileId };
  }

  async getActive() {
    const files = await prisma.file.findMany({ where: { status: "PROCESSING" } });
    return files.map(f => ({
      id: f.id,
      data: {
        fileId: f.id,
        sessionId: f.sessionId,
        storagePath: f.storagePath,
        mimeType: f.mimeType,
      } as ExtractionJobPayload,
      status: "PROCESSING" as FileStatus,
      entityCount: 0,
      error: null,
    }));
  }

  async getPending() {
    const files = await prisma.file.findMany({ where: { status: "PENDING" } });
    return files.map(f => ({
      id: f.id,
      data: {
        fileId: f.id,
        sessionId: f.sessionId,
        storagePath: f.storagePath,
        mimeType: f.mimeType,
      } as ExtractionJobPayload,
      status: "PENDING" as FileStatus,
      entityCount: 0,
      error: null,
    }));
  }

  async getJob(id: string) {
    const file = await prisma.file.findUnique({ where: { id } });
    if (!file) return null;
    const count = await prisma.occurrence.count({ where: { fileId: id } });
    return {
      id: file.id,
      data: { fileId: file.id },
      status: file.status as FileStatus,
      entityCount: count,
      error: file.errorMessage || null,
    };
  }

  removeJob(id: string) {
    const controller = this.activeControllers.get(id);
    if (controller) {
      controller.abort();
      this.activeControllers.delete(id);
    }
  }

  async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (true) {
        const file = await prisma.$transaction(async (tx) => {
          const pending = await tx.file.findMany({
            where: { status: "PENDING" },
            orderBy: { uploadedAt: "asc" },
            include: { session: true },
          });

          if (pending.length === 0) return null;

          pending.sort((a, b) => {
            const aSlow = a.mimeType.startsWith("image/") || a.mimeType === "application/pdf";
            const bSlow = b.mimeType.startsWith("image/") || b.mimeType === "application/pdf";
            if (aSlow && !bSlow) return 1;
            if (!aSlow && bSlow) return -1;
            return 0;
          });

          const target = pending[0];
          await tx.file.update({
            where: { id: target.id },
            data: { status: "PROCESSING" },
          });
          return target;
        }, {
          maxWait: 5000,
          timeout: 10000,
        });

        if (!file) break;

        const controller = new AbortController();
        this.activeControllers.set(file.id, controller);

        try {
          await executeExtraction(
            file.id,
            {
              fileId: file.id,
              sessionId: file.sessionId,
              storagePath: file.storagePath,
              mimeType: file.mimeType,
              windowSize: file.session.windowSize,
            },
            controller
          );
        } catch (err: any) {
          const message = err instanceof Error ? err.message : String(err);
          logger.error("SQLiteQueue job execution failed", { fileId: file.id, error: message });
          await prisma.file.update({
            where: { id: file.id },
            data: { status: "FAILED", errorMessage: message },
          });
        } finally {
          this.activeControllers.delete(file.id);
        }
      }
    } catch (err: any) {
      logger.error("SQLiteQueue processQueue loop encountered error", { error: err.message });
    } finally {
      this.isProcessing = false;
    }
  }
}

export const memoryQueue = new SQLiteQueue();
