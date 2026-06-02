'use client';

import { useCallback, useState } from 'react';
import { useUploadStore } from '@/store/uploadStore';
import type { UploadResponse } from '@/types/api';

const CONCURRENCY_LIMIT = 5; // Max number of concurrent uploads

const chunkArray = <T,>(arr: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

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
          for (const f of chunk) form.append('files', f);
          if (activeSessionId) form.append('sessionId', activeSessionId);
          let ws = windowSize;
          let mc = undefined;
          let mo = undefined;
          let mw = undefined;

          if (!activeSessionId && typeof window !== 'undefined') {
            const local = localStorage.getItem('entitygraph_default_settings');
            if (local) {
              try {
                const defaults = JSON.parse(local);
                if (ws === undefined && defaults.windowSize !== undefined) ws = defaults.windowSize;
                if (defaults.minConnections !== undefined) mc = defaults.minConnections;
                if (defaults.minOccurrences !== undefined) mo = defaults.minOccurrences;
                if (defaults.minEdgeWeight !== undefined) mw = defaults.minEdgeWeight;
              } catch (e) {
                console.error('Failed to parse default settings from localStorage:', e);
              }
            }
          }

          if (ws !== undefined) form.append('windowSize', String(ws));
          if (mc !== undefined) form.append('minConnections', String(mc));
          if (mo !== undefined) form.append('minOccurrences', String(mo));
          if (mw !== undefined) form.append('minEdgeWeight', String(mw));

          const res = await fetch('/api/upload', { method: 'POST', body: form });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Upload failed');
          }

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

        // If we don't have a sessionId yet, upload the first chunk sequentially to initialize the session
        if (!currentSessionId && chunks.length > 0) {
          const firstChunk = chunks.shift()!;
          const initializedSessionId = await uploadChunk(firstChunk, null);
          if (initializedSessionId) {
            currentSessionId = initializedSessionId;
            setSessionId(initializedSessionId);
          }
        }

        // Upload remaining chunks concurrently using a concurrency pool
        if (chunks.length > 0 && currentSessionId) {
          const chunksQueue = [...chunks];
          const concurrencyLimit = CONCURRENCY_LIMIT;

          const worker = async () => {
            while (chunksQueue.length > 0) {
              const nextChunk = chunksQueue.shift();
              if (!nextChunk) break;
              await uploadChunk(nextChunk, currentSessionId);
            }
          };

          const workers = Array.from(
            { length: Math.min(CONCURRENCY_LIMIT, chunksQueue.length) },
            worker
          );

          await Promise.all(workers);
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
