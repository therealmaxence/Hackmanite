// ─── Entity Type Definitions ──────────────────────────────────────────────────

export type EntityType =
  | "PERSON"
  | "ORGANIZATION"
  | "LOCATION"
  | "EMAIL"
  | "PHONE"
  | "IP_ADDRESS"
  | "URL"
  | "DATE"
  | "ADDRESS";

export type FileStatus = "PENDING" | "PROCESSING" | "DONE" | "FAILED";

export interface Entity {
  id: string;
  canonical: string;
  displayName: string;
  type: EntityType;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface Occurrence {
  id: string;
  entityId: string;
  fileId: string;
  count: number;
  excerpts?: Array<{ text: string; offset: number }>;
}

export interface FileRecord {
  id: string;
  sessionId: string;
  originalName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  status: FileStatus;
  errorMessage?: string;
  uploadedAt: string;
  processedAt?: string;
}

export interface EntityDetail extends Entity {
  files: Array<{
    fileId: string;
    fileName: string;
    count: number;
    snippets: Array<{
      text: string;
      offset: number;
      relatedEntityId: string;
      relatedEntityName: string;
      relatedEntityType: EntityType;
      weight: number;
    }>;
  }>;
  coOccurringEntities: Array<{
    id: string;
    displayName: string;
    type: EntityType;
    weight: number;
  }>;
}

// Color map for entity types
export const ENTITY_COLORS: Record<EntityType | "FILE", string> = {
  PERSON: "#8b5cf6",
  ORGANIZATION: "#3b82f6",
  LOCATION: "#10b981",
  EMAIL: "#f59e0b",
  PHONE: "#ec4899",
  IP_ADDRESS: "#3db2ff",
  URL: "#d946ef",
  DATE: "#14b8a6",
  ADDRESS: "#f97316",
  FILE: "#ffffff",
};
