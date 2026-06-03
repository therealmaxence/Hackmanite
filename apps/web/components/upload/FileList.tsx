'use client';

import { useEffect } from 'react';
import { useUploadStore, UploadedFile } from '@/store/uploadStore';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/upload/ProgressBar';
import useSWR from 'swr';

function FileRow({ file }: { file: UploadedFile }) {
  const { removeFile, sessionId, updateFileStatus } = useUploadStore();

  const handleRetry = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!sessionId) return;
    try {
      updateFileStatus(file.jobId, { status: 'PENDING', error: null, entityCount: 0 });
      const res = await fetch('/api/jobs/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, fileId: file.fileId }),
      });
      if (!res.ok) {
        throw new Error('Retry request failed');
      }
    } catch (err) {
      console.error('Failed to retry file', err);
      updateFileStatus(file.jobId, {
        status: 'FAILED',
        error: err instanceof Error ? err.message : 'Failed to trigger retry',
      });
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Remove "${file.originalName}" and its data?`)) {
      try {
        await fetch(`/api/files/${file.fileId}`, { method: 'DELETE' });
        removeFile(file.fileId);
      } catch (err) {
        console.error('Failed to delete file', err);
      }
    }
  };

  const sizeKB = Math.round(file.sizeBytes / 1024);
  const ext = file.originalName.split('.').pop()?.toUpperCase() || 'FILE';

  return (
    <div
      className="file-row"
      style={{
        padding: '1.25rem clamp(1rem, 4vw, 3rem)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        transition: 'background var(--transition-fast)',
        position: 'relative',
      }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLDivElement).style.background = 'var(--bg-raised)')
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLDivElement).style.background = 'transparent')
      }
    >
      <div className="file-row-top flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
        {/* Name and Extension */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
          <StatusDot status={file.status} />
          <span
            style={{
              flex: 1,
              fontSize: '0.8125rem',
              fontWeight: 500,
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={file.originalName}
          >
            {file.originalName}
          </span>
          <span
            style={{
              fontSize: '0.65rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
              background: 'var(--bg-raised)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '1px 6px',
              flexShrink: 0,
            }}
          >
            {ext}
          </span>
        </div>

        {/* Details & Delete Action */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }} className="w-full md:w-auto shrink-0">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span
              style={{
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
                flexShrink: 0,
              }}
            >
              {sizeKB < 1024 ? `${sizeKB}KB` : `${(sizeKB / 1024).toFixed(1)}MB`}
            </span>

            {file.status === 'DONE' && file.entityCount > 0 && (
              <Badge variant="success" size="sm">
                {file.entityCount} entities
              </Badge>
            )}
          </div>

          {file.status === 'FAILED' && (
            <button
              onClick={handleRetry}
              aria-label={`Retry ${file.originalName}`}
              title={`Retry ${file.originalName}`}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color var(--transition-fast)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-primary)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 11-.57-8.38l.73-.73" />
              </svg>
            </button>
          )}

          <button
            onClick={handleDelete}
            aria-label={`Remove ${file.originalName}`}
            title={`Remove ${file.originalName}`}
            className="file-row-delete"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.2s, background var(--transition-fast) ',
              marginLeft: 'auto',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--error)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <ProgressBar status={file.status} />

      {/* Error */}
      {file.status === 'FAILED' && file.error && (
        <p style={{ fontSize: '0.7rem', color: 'var(--error)', marginLeft: '1.5rem' }}>
          {file.error}
        </p>
      )}
    </div>
  );
}

function StatusDot({ status }: { status: UploadedFile['status'] }) {
  const colors: Record<string, string> = {
    PENDING: 'var(--text-muted)',
    PROCESSING: 'var(--accent)',
    DONE: 'var(--success)',
    FAILED: 'var(--error)',
  };

  return (
    <div style={{ position: 'relative', width: 8, height: 8, flexShrink: 0 }}>
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: 1,
          background: colors[status] || 'var(--text-muted)',
        }}
      />
    </div>
  );
}

export default function FileList() {
  const { files, sessionId, resetSession, updateFileStatus } = useUploadStore();

  const hasActiveJobs = files.some(
    (f) => f.status === 'PENDING' || f.status === 'PROCESSING'
  );
  const hasFailedJobs = files.some((f) => f.status === 'FAILED');

  const { data } = useSWR(
    hasActiveJobs && sessionId ? `/api/jobs?sessionId=${sessionId}` : null,
    (url: string) => fetch(url).then((r) => r.json()),
    { refreshInterval: 2000 }
  );

  useEffect(() => {
    if (sessionId) {
      fetch('/api/jobs/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.resumedCount > 0) {
            console.log(`Auto-resumed ${data.resumedCount} stalled files`);
          }
        })
        .catch((err) => console.error('Failed to trigger auto-resume', err));
    }
  }, [sessionId]);

  useEffect(() => {
    if (data && data.jobs) {
      const now = Date.now();
      for (const f of files) {
        if (f.status === 'PENDING' || f.status === 'PROCESSING') {
          const backendJob = data.jobs.find((j: any) => j.fileId === f.fileId);
          if (!backendJob) {
            const age = f.addedAt ? now - f.addedAt : 10000;
            if (age >= 8000) {
              updateFileStatus(f.jobId, {
                status: 'FAILED',
                error: 'Session reset or file lost on server restart',
              });
            }
          } else {
            const changed =
              f.status !== backendJob.status ||
              f.entityCount !== backendJob.entityCount ||
              f.error !== backendJob.error;

            if (changed) {
              updateFileStatus(f.jobId, {
                status: backendJob.status,
                entityCount: backendJob.entityCount,
                error: backendJob.error,
              });
            }
          }
        }
      }
    }
  }, [data, files, updateFileStatus]);

  const handleClearAll = async () => {
    if (confirm('Clear entire queue and reset graph?')) {
      try {
        if (sessionId) {
          await fetch(`/api/session/${sessionId}`, { method: 'DELETE' });
        }
        resetSession();
      } catch (err) {
        console.error('Failed to reset session', err);
      }
    }
  };

  if (files.length === 0) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1.5rem',
          color: 'var(--text-muted)',
        }}
      >
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          opacity={0.4}
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="9" y1="9" x2="15" y2="9" />
          <line x1="9" y1="12" x2="15" y2="12" />
          <line x1="9" y1="15" x2="12" y2="15" />
        </svg>
        <p style={{ fontSize: '0.8125rem' }}>No files yet</p>
        <p style={{ fontSize: '0.7rem' }}>Drop files on the left to begin</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          padding: '1rem clamp(1rem, 4vw, 3rem)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-surface)',
          zIndex: 1,
        }}
      >
        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Queue ({files.length})
        </span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {hasFailedJobs && (
            <button
              onClick={async () => {
                if (confirm('Retry all failed files?')) {
                  try {
                    for (const f of files) {
                      if (f.status === 'FAILED') {
                        updateFileStatus(f.jobId, { status: 'PENDING', error: null, entityCount: 0 });
                      }
                    }
                    const res = await fetch('/api/jobs/retry', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ sessionId, allFailed: true }),
                    });
                    if (!res.ok) {
                      throw new Error('Bulk retry request failed');
                    }
                  } catch (err) {
                    console.error('Failed to retry all failed files', err);
                  }
                }
              }}
              aria-label="Retry Failed"
              style={{
                fontSize: '0.8rem',
                color: 'var(--color-primary)',
                background: 'var(--bg-raised)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
                padding: '0 12px',
                minHeight: 36,
                borderRadius: 'var(--radius-sm)',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--border)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-raised)')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 11-.57-8.38l.73-.73" />
              </svg>
              Retry Failed
            </button>
          )}
          {hasActiveJobs && (
            <button
              onClick={async () => {
                if (confirm('Stop all pending extraction jobs?')) {
                  try {
                    if (sessionId) {
                      await fetch(`/api/jobs/stop`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ sessionId })
                      });
                    }
                  } catch (err) {
                    console.error('Failed to stop jobs', err);
                  }
                }
              }}
              aria-label="Stop Processing"
              style={{
                fontSize: '0.8rem',
                color: 'var(--text-primary)',
                background: 'var(--bg-raised)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
                padding: '0 12px',
                minHeight: 36,
                borderRadius: 'var(--radius-sm)',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--border)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-raised)')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
              Stop Processing
            </button>
          )}
          <button
            onClick={handleClearAll}
            aria-label="Clear queue"
            style={{
              fontSize: '0.8rem',
              color: 'var(--error)',
              background: 'none',
              border: '1px solid transparent',
              cursor: 'pointer',
              padding: '0 12px',
              minHeight: 36,
              borderRadius: 'var(--radius-sm)',
              fontWeight: 500,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(240,76,106,0.06)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          >
            Clear All
          </button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', maxHeight: 600 }}>
        {files.map((f) => (
          <FileRow key={f.jobId} file={f} />
        ))}
      </div>
    </div>
  );
}
