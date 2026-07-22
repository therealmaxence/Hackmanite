export interface ExtractionJobPayload {
  fileId: string;
  sessionId: string;
  storagePath: string;
  mimeType: string;
  windowSize?: number;
}

export type FileStatus = "PENDING" | "PROCESSING" | "DONE" | "FAILED" | "CANCELLED";

export interface JobStatus {
  jobId: string;
  fileId: string;
  status: FileStatus;
  entityCount: number;
  error: string | null;
}
