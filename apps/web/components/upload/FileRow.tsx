'use client';

import { useState } from 'react';
import { useUploadStore, UploadedFile } from '@/store/uploadStore';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/upload/ProgressBar';
import StatusDot from './StatusDot';

export default function FileRow({ file }: { file: UploadedFile }) {
  const { removeFile, sessionId, updateFileStatus } = useUploadStore();
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

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
      if (!res.ok) throw new Error('Retry request failed');
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
        borderBottom: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        transition: isHovered ? 'none' : 'background 250ms ease',
        position: 'relative',
        background: isHovered
          ? `var(--noise-bg), radial-gradient(circle 120px at ${coords.x}px ${coords.y}px, var(--color-surface-hover), var(--bg-surface))`
          : 'var(--bg-surface)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={handleMouseMove}
    >
      <div className="file-row-top flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
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
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              padding: '1px 6px',
              flexShrink: 0,
            }}
          >
            {ext}
          </span>
        </div>

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

      <ProgressBar status={file.status} />

      {file.status === 'FAILED' && file.error && (
        <p style={{ fontSize: '0.7rem', color: 'var(--error)', marginLeft: '1.5rem' }}>
          {file.error}
        </p>
      )}
    </div>
  );
}
