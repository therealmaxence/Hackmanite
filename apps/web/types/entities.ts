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

export type FileStatus = "PENDING" | "PROCESSING" | "DONE" | "FAILED" | "CANCELLED";

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

// Color map for entity types (UV Hackmanite spectrum)
export const ENTITY_COLORS: Record<EntityType | "FILE", string> = {
  PERSON: "#a78bfa",       // Vibrant lavender
  ORGANIZATION: "#00f0ff", // Neon cyan/teal
  LOCATION: "#34d399",     // Mint green
  EMAIL: "#ff2a85",        // Neon pink/rose
  PHONE: "#ff9f1c",        // Amber orange
  IP_ADDRESS: "#818cf8",   // Neon indigo
  URL: "#d946ef",          // Electric magenta
  DATE: "#facc15",         // Gold/yellow
  ADDRESS: "#c084fc",      // Orchid purple
  FILE: "#e0e0e8",         // Neutral stone gray
};
