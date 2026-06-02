'use client';

import { useState, useEffect } from 'react';
import { useUploadStore } from '@/store/uploadStore';

export default function StatusBar() {
  const { files, doneCount, pendingCount, failedCount } = useUploadStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      <span>
        <span style={{ color: 'var(--text-secondary)' }}>{mounted ? files.length : 0}</span> files
      </span>
      <span>
        <span style={{ color: 'var(--success)' }}>{mounted ? doneCount() : 0}</span> done
      </span>
      {mounted && pendingCount() > 0 && (
        <span>
          <span style={{ color: 'var(--accent)' }}>{pendingCount()}</span> processing
        </span>
      )}
      {mounted && failedCount() > 0 && (
        <span>
          <span style={{ color: 'var(--error)' }}>{failedCount()}</span> failed
        </span>
      )}
      <span>DataLake Entity Graph Explorer</span>
    </footer>
  );
}
