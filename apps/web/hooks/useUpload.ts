'use client';

import { useCallback, useState } from 'react';
import { useUploadStore } from '@/store/uploadStore';
import type { UploadResponse } from '@/types/api';

const CONCURRENCY_LIMIT = 5;

const chunkArray = <T,>(arr: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, (i + 1) * size));

export function useUpload() {
  const { setSessionId, addFiles, setUploading, sessionId } = useUploadStore();
  const [error, setError] = useState<string | null>(null);

  const uploadFiles = useCallback(
    async (files: File[], windowSize?: number) => {
      if (!files.length) return;
      setError(null);
      setUploading(true);

      let currentSessionId = sessionId;

      const uploadChunk = async (chunk: File[], activeSessionId: string | null): Promise<string | null> => {
        try {
          const form = new FormData();
          chunk.forEach((f) => form.append('files', f));
          if (activeSessionId) form.append('sessionId', activeSessionId);

          let params: Record<string, any> = { windowSize };
          if (!activeSessionId && typeof window !== 'undefined') {
            try {
              const defaults = JSON.parse(localStorage.getItem('entitygraph_default_settings') || '{}');
              params = {
                windowSize: windowSize ?? defaults.windowSize,
                minConnections: defaults.minConnections,
                minOccurrences: defaults.minOccurrences,
                minEdgeWeight: defaults.minEdgeWeight,
              };
            } catch (e) {
              console.error('Failed to parse default settings:', e);
            }
          }
          Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined) form.append(k, String(v));
          });

          const res = await fetch('/api/upload', { method: 'POST', body: form });
          if (!res.ok) throw new Error((await res.json()).error || 'Upload failed');

          const data: UploadResponse = await res.json();
          addFiles(
            data.jobs.map((j, i) => {
              const matchedFile = chunk.find((f) => f.name === j.originalName) || chunk[i];
              return {
                fileId: j.fileId,
                jobId: j.jobId,
                originalName: j.originalName,
                status: 'PENDING' as const,
                entityCount: 0,
                error: null,
                sizeBytes: matchedFile?.size ?? 0,
                mimeType: matchedFile?.type ?? 'application/octet-stream',
                addedAt: Date.now(),
              };
            })
          );

          return data.sessionId;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Upload failed';
          setError((prev) => (prev ? `${prev}; ${msg}` : msg));
          return activeSessionId;
        }
      };

      try {
        const chunks = chunkArray(files, 10);

        if (!currentSessionId && chunks.length > 0) {
          const initializedSessionId = await uploadChunk(chunks.shift()!, null);
          if (initializedSessionId) {
            currentSessionId = initializedSessionId;
            setSessionId(initializedSessionId);
          }
        }

        if (chunks.length > 0 && currentSessionId) {
          const chunksQueue = [...chunks];
          const worker = async () => {
            while (chunksQueue.length > 0) {
              const nextChunk = chunksQueue.shift();
              if (nextChunk) await uploadChunk(nextChunk, currentSessionId);
            }
          };
          await Promise.all(
            Array.from({ length: Math.min(CONCURRENCY_LIMIT, chunksQueue.length) }, worker)
          );
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Upload batch failed';
        setError((prev) => (prev ? `${prev}; ${msg}` : msg));
      } finally {
        setUploading(false);
      }
    },
    [sessionId, setSessionId, addFiles, setUploading]
  );

  return { uploadFiles, isUploading: useUploadStore((s) => s.isUploading), error };
}
