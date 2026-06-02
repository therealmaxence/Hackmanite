// ─── API Response Types ───────────────────────────────────────────────────────

export interface ApiError {
  error: string;
  code: string;
}

export interface UploadResponse {
  sessionId: string;
  jobs: Array<{
    fileId: string;
    jobId: string;
    originalName: string;
  }>;
}

export interface JobStatusResponse {
  jobId: string;
  fileId: string;
  status: "PENDING" | "PROCESSING" | "DONE" | "FAILED";
  entityCount: number;
  error: string | null;
}

export interface NodesResponse {
  nodes: Array<{
    id: string;
    label: string;
    type: string;
    fileCount: number;
    totalOccurrences: number;
  }>;
}

export interface EdgesResponse {
  edges: Array<{
    source: string;
    target: string;
    weight: number;
  }>;
}

export interface EntitySearchResponse {
  results: Array<{
    id: string;
    displayName: string;
    type: string;
    canonical: string;
  }>;
  total: number;
  page: number;
}

export interface AdminStatsResponse {
  queueLength: number;
  jobsToday: { processed: number; failed: number };
  entityCountByType: Record<string, number>;
  redisMemoryMB: number;
  recentErrors: Array<{
    fileId: string;
    fileName: string;
    error: string;
    at: string;
  }>;
}

export interface SessionExportResponse {
  sessionId: string;
  exportedAt: string;
  windowSize: number;
  nodes: Array<{
    id: string;
    label: string;
    type: string;
    canonical: string;
    metadata: Record<string, unknown> | null;
    occurrences: Array<{
      fileId: string;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      count: number;
      excerpts: any;
      originalCreatedAt: string | null;
    }>;
  }>;
  edges: Array<{
    source: string;
    target: string;
    weight: number;
    distance: number;
    snippet: string;
    sourceOffset: number;
    targetOffset: number;
    fileId: string;
    fileName: string;
  }>;
}

// ─── Error Codes ──────────────────────────────────────────────────────────────

export const ErrorCodes = {
  UPLOAD_TOO_LARGE: "UPLOAD_TOO_LARGE",
  UNSUPPORTED_TYPE: "UNSUPPORTED_TYPE",
  EXTRACTION_FAILED: "EXTRACTION_FAILED",
  OCR_LOW_CONFIDENCE: "OCR_LOW_CONFIDENCE",
  DB_WRITE_FAILED: "DB_WRITE_FAILED",
  GRAPH_BUILD_FAILED: "GRAPH_BUILD_FAILED",
  SESSION_EXPIRED: "SESSION_EXPIRED",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
