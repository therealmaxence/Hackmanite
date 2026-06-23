import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import SectionCard from './SectionCard';
import StatusBadge, { ImportState } from './StatusBadge';
import Spinner from '@/components/ui/Spinner';
import { useUploadStore } from '@/store/uploadStore';
import { useTranslation } from '@/lib/i18n';

interface ImportResult {
  sessionId: string;
  files: Array<{
    fileId: string;
    jobId: string;
    originalName: string;
    status: 'DONE';
    entityCount: number;
    error: null;
    sizeBytes: number;
    mimeType: string;
    addedAt: number;
  }>;
  emailsRestoredCount?: number;
}

export default function ImportCard() {
  const router = useRouter();
  const { setSessionId, addFiles, clearFiles } = useUploadStore();
  const { t } = useTranslation();

  const [importState, setImportState] = useState<ImportState>('idle');
  const [importError, setImportError] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImportFile = useCallback(async (file: File) => {
    setImportState('parsing');
    setImportError('');
    setImportResult(null);

    let body: unknown;
    try {
      body = JSON.parse(await file.text());
    } catch {
      setImportError(t('import.invalid_json'));
      setImportState('error');
      return;
    }

    setImportState('uploading');
    try {
      const res = await fetch('/api/session/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);

      clearFiles();
      setSessionId(data.sessionId);
      addFiles(data.files);
      setImportResult(data);
      setImportState('done');
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed');
      setImportState('error');
    }
  }, [setSessionId, addFiles, clearFiles, t]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) processImportFile(e.target.files[0]);
    e.target.value = '';
  }, [processImportFile]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.[0]) processImportFile(e.dataTransfer.files[0]);
  }, [processImportFile]);

  const isImportBusy = importState === 'parsing' || importState === 'uploading';

  const btnBaseStyle = {
    padding: '0.5rem 1.25rem',
    fontSize: '0.8125rem',
    fontWeight: 600,
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  };

  return (
    <SectionCard
      title={t('import.title')}
      description={t('import.desc')}
    >
      {/* Drop zone */}
      <div
        id="import-dropzone"
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !isImportBusy && fileInputRef.current?.click()}
        style={{
          border: 'none',
          borderRadius: 'var(--radius)',
          padding: '2.5rem 1.5rem',
          textAlign: 'center',
          cursor: isImportBusy ? 'not-allowed' : 'pointer',
          background: dragOver ? 'var(--color-surface-overlay)' : 'var(--color-surface)',
          transition: 'all 0.15s ease-in-out',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
          id="import-file-input"
        />

        {isImportBusy ? (
          <>
            <Spinner size={28} />
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', margin: 0 }}>
              {importState === 'parsing' ? t('import.parsing') : t('import.uploading')}
            </p>
          </>
        ) : (
          <>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={dragOver ? 'var(--color-primary)' : 'var(--color-text-muted)'} strokeWidth="1.5" style={{ opacity: dragOver ? 1 : 0.5 }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <div>
              <p style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--color-text)', margin: 0, marginBottom: '0.25rem' }}>
                {t('import.drop_copy')}<span style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>{t('import.browse')}</span>
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>
                {t('import.accepts', { code: '.json' })}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Import status */}
      {importState !== 'idle' && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <StatusBadge state={importState} errorMsg={importError} />
          {importState === 'error' && (
            <p style={{ fontSize: '0.75rem', color: '#EC4899', margin: 0, paddingTop: '3px' }}>⚠ {importError}</p>
          )}
        </div>
      )}

      {/* Success summary */}
      {importState === 'done' && importResult && (
        <div style={{
          padding: '1.25rem',
          background: '#0e2316',
          border: 'none',
          borderRadius: 'var(--radius)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#10B981' }}>{t('import.success')}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
            {[
              { label: t('import.metric_id'), value: importResult.sessionId.slice(0, 12) + '…' },
              { label: t('import.metric_files'), value: String(importResult.files.length) },
              { label: t('import.metric_entities'), value: String(importResult.files.reduce((s, f) => s + f.entityCount, 0)) },
              { label: t('import.metric_emails'), value: String(importResult.emailsRestoredCount || 0) },
            ].map(({ label, value }) => (
              <div key={label} style={{ padding: '0.75rem', background: 'var(--color-bg)', borderRadius: 'var(--radius-sm)', border: 'none' }}>
                <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', margin: 0, marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
                <p style={{ fontSize: '0.9rem', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--color-text)', margin: 0 }}>{value}</p>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
            <button
              id="goto-graph-btn"
              onClick={() => router.push('/graph')}
              style={{ ...btnBaseStyle, background: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
            >
              {t('import.open_graph')}
            </button>
            {importResult.emailsRestoredCount && importResult.emailsRestoredCount > 0 ? (
              <button
                id="goto-emails-btn"
                onClick={() => router.push('/emails')}
                style={{ ...btnBaseStyle, background: 'var(--color-surface-raised)', color: 'var(--color-primary)' }}
              >
                {t('import.open_emails')}
              </button>
            ) : null}
            <button
              id="goto-stats-btn"
              onClick={() => router.push('/stats')}
              style={{ ...btnBaseStyle, background: 'var(--color-surface-raised)', color: 'var(--color-text)' }}
            >
              {t('import.open_stats')}
            </button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
