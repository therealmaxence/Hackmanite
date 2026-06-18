'use client';

import React from 'react';
import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Spinner from '@/components/ui/Spinner';
import { getFilesFromEvent } from '@/lib/upload-utils';
import { useTranslation } from '@/lib/i18n';

interface DropZoneProps {
  onDrop: (files: File[]) => void;
  isLoading?: boolean;
}

const ACCEPTED_TYPES = {
  'text/plain': ['.txt', '.text', '.cfg', '.conf', '.ini', '.log'],
  'text/markdown': ['.md', '.markdown'],
  'text/csv': ['.csv'],
  'text/html': ['.html', '.htm'],
  'application/pdf': ['.pdf'],
  'application/json': ['.json'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'application/msword': ['.doc'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/tiff': ['.tif', '.tiff'],
  'image/webp': ['.webp'],
  'text/x-python': ['.py'],
  'application/x-python': ['.py'],
  'text/javascript': ['.js', '.jsx'],
  'application/javascript': ['.js', '.jsx'],
  'text/x-sh': ['.sh'],
  'message/rfc822': ['.eml'],
  'application/vnd.ms-outlook': ['.pst'],
  'application/octet-stream': ['.py', '.js', '.ts', '.tsx', '.sh', '.csv', '.json', '.md', '.txt', '.eml', '.pst'],
};

export default function DropZone({ onDrop, isLoading }: DropZoneProps) {
  const { t } = useTranslation();
  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop: useCallback((accepted: File[]) => onDrop(accepted), [onDrop]),
    getFilesFromEvent,
    accept: ACCEPTED_TYPES,
    maxSize: 500 * 1024 * 1024, // 500MB
    multiple: true,
    disabled: isLoading,
  });

  const bgColor = isDragReject
    ? '#2d141a'
    : isDragActive
    ? '#221d2d'
    : 'var(--color-surface)';

  return (
    <div
      {...getRootProps()}
      id="dropzone"
      className="dropzone"
      style={{
        borderRadius: 'var(--radius)',
        background: bgColor,
        boxShadow: isDragActive ? 'var(--glow-modere)' : 'none',
        padding: 'clamp(1.25rem, 4vh, 3.5rem) clamp(1rem, 3vw, 2.5rem)',
        textAlign: 'center',
        cursor: isLoading ? 'not-allowed' : 'pointer',
        transition: 'background-color 80ms ease, box-shadow 240ms cubic-bezier(0.22, 1, 0.36, 1)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <input {...getInputProps()} id="file-input" />

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
          <Spinner size={32} />
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            {t('dropzone.uploading')}
          </p>
        </div>
      ) : (
        <>
          {/* Icon */}
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 2,
              background: isDragActive ? 'var(--color-primary)' : 'var(--color-bg)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              transition: 'background-color 80ms ease',
            }}
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke={isDragActive ? 'var(--color-on-primary)' : 'var(--color-text-muted)'}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>

          {isDragReject ? (
            <p style={{ color: 'var(--color-error)', fontWeight: 500 }}>
              {t('dropzone.reject')}
            </p>
          ) : isDragActive ? (
            <p style={{ color: 'var(--color-primary-hover)', fontWeight: 500 }}>
              {t('dropzone.active')}
            </p>
          ) : (
            <>
              <p style={{ color: 'var(--color-text)', fontWeight: 500, marginBottom: '0.75rem' }}>
                {t('dropzone.idle_1')}
                <span style={{ color: 'var(--color-primary-hover)' }}>{t('dropzone.idle_2')}</span>
              </p>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                {t('dropzone.limits')}
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}
