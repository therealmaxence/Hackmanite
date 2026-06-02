'use client';

import React from 'react';
import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Spinner from '@/components/ui/Spinner';
import { getFilesFromEvent } from '@/lib/upload-utils';

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
  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop: useCallback((accepted: File[]) => onDrop(accepted), [onDrop]),
    getFilesFromEvent,
    accept: ACCEPTED_TYPES,
    maxSize: 500 * 1024 * 1024, // 500MB
    multiple: true,
    disabled: isLoading,
  });

  const borderColor = isDragReject
    ? 'var(--error)'
    : isDragActive
    ? 'var(--accent)'
    : 'var(--border-strong)';

  const bgColor = isDragActive
    ? 'var(--bg-raised)'
    : 'transparent';

  return (
    <div
      {...getRootProps()}
      id="dropzone"
      className="dropzone"
      style={{
        border: `2px dashed ${borderColor}`,
        borderRadius: 'var(--radius)',
        background: bgColor,
        padding: 'clamp(1.75rem, 6vw, 5rem) clamp(1rem, 4vw, 3rem)',
        textAlign: 'center',
        cursor: isLoading ? 'not-allowed' : 'pointer',
        transition: 'all var(--transition)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <input {...getInputProps()} id="file-input" />



      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
          <Spinner size={32} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Uploading files…
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
              background: isDragActive ? 'var(--accent)' : 'var(--bg-raised)',
              border: `1px solid ${isDragActive ? 'var(--accent)' : 'var(--border)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              transition: 'all var(--transition)',
            }}
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke={isDragActive ? '#fff' : 'var(--text-secondary)'}
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
            <p style={{ color: 'var(--error)', fontWeight: 500 }}>
              Unsupported file type
            </p>
          ) : isDragActive ? (
            <p style={{ color: 'var(--accent)', fontWeight: 500 }}>
              Release to upload
            </p>
          ) : (
            <>
              <p style={{ color: 'var(--text-primary)', fontWeight: 500, marginBottom: '0.75rem' }}>
                Drop files here or{' '}
                <span style={{ color: 'var(--accent)' }}>click to browse</span>
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', lineHeight: 1.6 }}>
                PDF, DOCX, XLSX, TXT, MD, JSON, CSV, PY, JS, PNG, JPG, TIFF, EML, PST
                <br />
                Up to 100 MB per file · Multiple files supported
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}
