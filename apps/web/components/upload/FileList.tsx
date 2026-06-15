'use client';

import { useEffect } from 'react';
import { useUploadStore } from '@/store/uploadStore';
import useSWR from 'swr';
import FileRow from './FileRow';
import { useTranslation } from '@/lib/i18n';

export default function FileList() {
  const { files, sessionId, resetSession, updateFileStatus } = useUploadStore();
  const { t } = useTranslation();

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
    if (confirm(t('upload.confirm_clear'))) {
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
        <p style={{ fontSize: '0.8125rem' }}>{t('home.empty_queue_title')}</p>
        <p style={{ fontSize: '0.7rem' }}>{t('home.empty_queue_copy')}</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          padding: '1rem clamp(1rem, 4vw, 3rem)',
          borderBottom: 'none',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-surface)',
          zIndex: 1,
        }}
      >
        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {t('home.queue_label')} ({files.length})
        </span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {hasFailedJobs && (
            <button
              onClick={async () => {
                if (confirm(t('upload.confirm_retry'))) {
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
                    if (!res.ok) throw new Error('Bulk retry request failed');
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
                border: 'none',
                cursor: 'pointer',
                padding: '0 12px',
                minHeight: 36,
                borderRadius: 'var(--radius-sm)',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-raised)')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 11-.57-8.38l.73-.73" />
              </svg>
              {t('upload.retry_failed')}
            </button>
          )}
          {hasActiveJobs && (
            <button
              onClick={async () => {
                if (confirm(t('upload.confirm_stop'))) {
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
                border: 'none',
                cursor: 'pointer',
                padding: '0 12px',
                minHeight: 36,
                borderRadius: 'var(--radius-sm)',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-raised)')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
              {t('upload.stop_processing')}
            </button>
          )}
          <button
            onClick={handleClearAll}
            aria-label="Clear queue"
            style={{
              fontSize: '0.8rem',
              color: 'var(--error)',
              background: 'var(--bg-raised)',
              border: 'none',
              cursor: 'pointer',
              padding: '0 12px',
              minHeight: 36,
              borderRadius: 'var(--radius-sm)',
              fontWeight: 500,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#2a171d')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-raised)')}
          >
            {t('upload.clear_all')}
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
