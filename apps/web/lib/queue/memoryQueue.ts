import { prisma } from "@/lib/prisma";
import { ExtractionJobPayload, FileStatus } from "./types";
import { executeExtraction } from "./executor";
import { logger } from "@/lib/logger";

const mapFile = (f: any, status: FileStatus) => ({
  id: f.id,
  data: { fileId: f.id, sessionId: f.sessionId, storagePath: f.storagePath, mimeType: f.mimeType } as ExtractionJobPayload,
  status,
  entityCount: 0,
  error: null,
});

export class SQLiteQueue {
  private isProcessing = false;
  private activeControllers = new Map<string, AbortController>();

  async add(_data: ExtractionJobPayload, _options?: { priority?: number }): Promise<{ id: string }> {
    this.processQueue().catch((err) => logger.error("Failed to process queue in add", { error: err.message }));
    return { id: _data.fileId };
  }

  async getActive() {
    return (await prisma.file.findMany({ where: { status: "PROCESSING" } })).map((f) => mapFile(f, "PROCESSING"));
  }

  async getPending() {
    return (await prisma.file.findMany({ where: { status: "PENDING" } })).map((f) => mapFile(f, "PENDING"));
  }

  async getJob(id: string) {
    const file = await prisma.file.findUnique({ where: { id } });
    if (!file) return null;
    return {
      id: file.id,
      data: { fileId: file.id },
      status: file.status as FileStatus,
      entityCount: await prisma.occurrence.count({ where: { fileId: id } }),
      error: file.errorMessage || null,
    };
  }

  removeJob(id: string) {
    this.activeControllers.get(id)?.abort();
    this.activeControllers.delete(id);
  }

  async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (true) {
        const file = await prisma.$transaction(async (tx) => {
          const target = await tx.file.findFirst({
            where: { status: "PENDING", NOT: [{ mimeType: "application/pdf" }, { mimeType: { startsWith: "image/" } }] },
            orderBy: { uploadedAt: "asc" },
            include: { session: true },
          }) ?? await tx.file.findFirst({
            where: { status: "PENDING" },
            orderBy: { uploadedAt: "asc" },
            include: { session: true },
          });

          if (!target) return null;
          await tx.file.update({ where: { id: target.id }, data: { status: "PROCESSING" } });
          return target;
        }, { maxWait: 5000, timeout: 10000 });

        if (!file) break;

        const controller = new AbortController();
        this.activeControllers.set(file.id, controller);

        try {
          await executeExtraction(
            file.id,
            { fileId: file.id, sessionId: file.sessionId, storagePath: file.storagePath, mimeType: file.mimeType, windowSize: file.session.windowSize },
            controller
          );
        } catch (err: any) {
          const message = err instanceof Error ? err.message : String(err);
          logger.error("SQLiteQueue job execution failed", { fileId: file.id, error: message });
          await prisma.file.update({ where: { id: file.id }, data: { status: "FAILED", errorMessage: message } });
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
