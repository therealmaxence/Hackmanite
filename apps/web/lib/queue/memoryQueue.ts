import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { ExtractionJobPayload, FileStatus } from "./types";
import { executeExtraction } from "./executor";

export class MemoryJob {
  id: string;
  data: ExtractionJobPayload;
  status: FileStatus = "PENDING";
  entityCount: number = 0;
  error: string | null = null;
  priority: number;

  constructor(data: ExtractionJobPayload, priority: number) {
    this.id = randomUUID();
    this.data = data;
    this.priority = priority;
  }
}

export class MemoryQueue {
  private jobs = new Map<string, MemoryJob>();
  private activeJobs = new Set<string>();
  private isProcessing = false;
  private activeControllers = new Map<string, AbortController>();

  async add(data: ExtractionJobPayload, options?: { priority?: number }): Promise<{ id: string }> {
    const priority = options?.priority ?? 1;
    const job = new MemoryJob(data, priority);
    this.jobs.set(job.id, job);
    
    this.processQueue();
    return { id: job.id };
  }

  getJob(id: string): MemoryJob | null {
    return this.jobs.get(id) ?? null;
  }

  async getActive(): Promise<MemoryJob[]> {
    return Array.from(this.activeJobs).map(id => this.jobs.get(id)!).filter(Boolean);
  }

  async getPending(): Promise<MemoryJob[]> {
    return Array.from(this.jobs.values()).filter(j => j.status === "PENDING");
  }

  abortJob(id: string) {
    const controller = this.activeControllers.get(id);
    if (controller) {
      controller.abort();
      this.activeControllers.delete(id);
    }
  }

  removeJob(id: string) {
    this.jobs.delete(id);
    this.activeJobs.delete(id);
    const controller = this.activeControllers.get(id);
    if (controller) {
      controller.abort();
      this.activeControllers.delete(id);
    }
  }

  private async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (true) {
        const pendingJobs = Array.from(this.jobs.values()).filter(j => j.status === "PENDING");
        if (pendingJobs.length === 0) break;

        pendingJobs.sort((a, b) => a.priority - b.priority);
        const job = pendingJobs[0];

        await this.runJob(job);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async runJob(job: MemoryJob) {
    job.status = "PROCESSING";
    this.activeJobs.add(job.id);
    const controller = new AbortController();
    this.activeControllers.set(job.id, controller);

    try {
      const result = await executeExtraction(job.id, job.data, controller);
      job.status = "DONE";
      job.entityCount = result.entityCount;
    } catch (err: any) {
      const message = err instanceof Error ? err.message : String(err);
      job.status = "FAILED";
      job.error = message;

      await prisma.file.update({
        where: { id: job.data.fileId },
        data: { status: "FAILED", errorMessage: message },
      });
    } finally {
      this.activeJobs.delete(job.id);
      this.activeControllers.delete(job.id);
    }
  }
}

export const memoryQueue = new MemoryQueue();
