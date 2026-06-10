'use client';

import { useState, useEffect } from 'react';
import { useUploadStore } from '@/store/uploadStore';

const statusProgress: Record<string, number> = {
  PENDING: 5,
  PROCESSING: 60,
  DONE: 100,
  FAILED: 100,
};

export default function StatusBar() {
  const { files, doneCount, pendingCount, failedCount, isUploading } = useUploadStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getActiveBatchFiles = () => {
    const active = files.filter(f => f.status === 'PENDING' || f.status === 'PROCESSING');
    if (active.length === 0) {
      return [];
    }
    const oldestActive = active.reduce((oldest, current) => {
      const oldestTime = oldest.addedAt || 0;
      const currentTime = current.addedAt || 0;
      return currentTime < oldestTime ? current : oldest;
    }, active[0]);

    const oldestTimestamp = oldestActive.addedAt || 0;
    return files.filter(f => (f.addedAt || 0) >= oldestTimestamp - 1000);
  };

  const getAverageProgress = () => {
    const batchFiles = getActiveBatchFiles();
    if (batchFiles.length === 0) {
      return isUploading ? 5 : 0;
    }
    const total = batchFiles.reduce((acc, f) => acc + (statusProgress[f.status] || 0), 0);
    return Math.round(total / batchFiles.length);
  };

  const avgProgress = getAverageProgress();
  const showProgressBar = mounted && (pendingCount() > 0 || isUploading);

  return (
    <footer
      className="status-bar"
      style={{
        height: 40,
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 2.5rem',
        gap: '2rem',
        fontSize: '0.75rem',
        fontFamily: 'var(--font-mono)',
        color: 'var(--text-muted)',
      }}
    >
      <style jsx>{`
        .global-progress-bar-fill {
          background: linear-gradient(90deg, #8b5cf6, #ec4899, #8b5cf6);
          background-size: 200% 100%;
          animation: globalShimmer 1.5s infinite linear;
        }
        @keyframes globalShimmer {
          0% { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }
      `}</style>

      <span>
        <span style={{ color: 'var(--text-secondary)' }}>{mounted ? files.length : 0}</span> files
      </span>
      <span>
        <span style={{ color: 'var(--success)' }}>{mounted ? doneCount() : 0}</span> done
      </span>
      {mounted && (pendingCount() > 0 || isUploading) && (
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>
            {pendingCount() > 0 ? (
              <>
                <span style={{ color: 'var(--accent)' }}>{pendingCount()}</span> processing
              </>
            ) : (
              <span style={{ color: 'var(--accent)' }}>uploading...</span>
            )}
          </span>
        </span>
      )}
      {showProgressBar && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            width: '140px',
            marginLeft: '-1rem',
          }}
        >
          <div
            style={{
              height: '5px',
              flex: 1,
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '2.5px',
              overflow: 'hidden',
            }}
          >
            <div
              className="global-progress-bar-fill"
              style={{
                height: '100%',
                width: `${avgProgress}%`,
                borderRadius: '2.5px',
                transition: 'width 400ms ease',
              }}
            />
          </div>
          <span style={{ color: 'var(--text-secondary)', minWidth: '32px', textAlign: 'left' }}>
            {avgProgress}%
          </span>
        </div>
      )}
      {mounted && failedCount() > 0 && (
        <span>
          <span style={{ color: 'var(--error)' }}>{failedCount()}</span> failed
        </span>
      )}
      <span>Hackmanite</span>
    </footer>
  );
}
