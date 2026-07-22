import { create } from "zustand";
import { persist } from "zustand/middleware";
import { FileStatus, FileRecord } from "@/types/entities";

export interface UploadedFile {
  fileId: string;
  jobId: string;
  originalName: string;
  status: FileStatus;
  entityCount: number;
  error: string | null;
  sizeBytes: number;
  mimeType: string;
  addedAt?: number;
}

interface UploadStore {
  sessionId: string | null;
  files: UploadedFile[];
  isUploading: boolean;

  setSessionId: (id: string) => void;
  addFiles: (files: UploadedFile[]) => void;
  updateFileStatus: (jobId: string, update: Partial<UploadedFile>) => void;
  removeFile: (fileId: string) => void;
  resetSession: () => void;
  clearFiles: () => void;
  setUploading: (val: boolean) => void;

  // Computed
  doneCount: () => number;
  failedCount: () => number;
  pendingCount: () => number;
}

export const useUploadStore = create<UploadStore>()(
  persist(
    (set, get) => ({
      sessionId: null,
      files: [],
      isUploading: false,

      setSessionId: (id) => set({ sessionId: id }),

      addFiles: (newFiles) =>
        set((state) => ({ files: [...state.files, ...newFiles] })),

      updateFileStatus: (jobId, update) =>
        set((state) => ({
          files: state.files.map((f) =>
            f.jobId === jobId ? { ...f, ...update } : f
          ),
        })),

      removeFile: (fileId) =>
        set((state) => ({
          files: state.files.filter((f) => f.fileId !== fileId),
        })),

      resetSession: () => set({ files: [], sessionId: null }),

      clearFiles: () => set({ files: [] }),

      setUploading: (val) => set({ isUploading: val }),

      doneCount: () => get().files.filter((f) => f.status === "DONE").length,
      failedCount: () => get().files.filter((f) => f.status === "FAILED").length,
      pendingCount: () =>
        get().files.filter(
          (f) => f.status === "PENDING" || f.status === "PROCESSING"
        ).length,
    }),
    { 
      name: "upload-store",
      partialize: (state) => ({
        sessionId: state.sessionId,
        files: state.files,
      }),
      merge: (persistedState: any, currentState) => ({
        ...currentState,
        ...persistedState,
        isUploading: false, // Force reset on load
      }),
    }
  )
);
