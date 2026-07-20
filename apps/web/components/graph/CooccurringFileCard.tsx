'use client';

import { formatBytes } from './SnippetCard';
import { useTranslation } from '@/lib/i18n';

interface FileItem {
  id: string;
  originalName: string;
  sizeBytes: number;
  mimeType: string;
}

interface Props {
  file: FileItem;
}

export default function CooccurringFileCard({ file }: Props) {
  const { t } = useTranslation();
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        padding: '1rem',
        background: 'rgba(16,0,43,0.4)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <h4
          style={{
            fontSize: '0.85rem',
            fontWeight: 600,
            color: 'var(--color-text)',
            marginBottom: '0.25rem',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {file.originalName}
        </h4>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.725rem',
            color: 'var(--color-text-muted)',
          }}
        >
          <span style={{ fontFamily: 'var(--font-mono)' }}>
            {formatBytes(file.sizeBytes)}
          </span>
          <span>•</span>
          <span style={{ textTransform: 'uppercase' }}>
            {file.mimeType.split('/').pop()}
          </span>
        </div>
      </div>
      <a
        href={`/api/files/${file.id}/download`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          borderRadius: 'var(--radius-sm)',
          background: 'var(--color-primary)',
          color: 'var(--color-on-primary)',
          textDecoration: 'none',
          transition: 'background var(--transition-fast)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--color-primary-hover)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--color-primary)';
        }}
        title={t('graph.panel.open_file')}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      </a>
    </div>
  );
}
