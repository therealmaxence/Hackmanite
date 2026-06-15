import { useState, useCallback } from 'react';
import SectionCard from './SectionCard';
import StatusBadge, { ExportState } from './StatusBadge';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from '@/lib/i18n';

interface ExportCardProps {
  sessionId: string | null;
}

export default function ExportCard({ sessionId }: ExportCardProps) {
  const [exportState, setExportState] = useState<ExportState>('idle');
  const [exportError, setExportError] = useState('');
  const [lastExportedAt, setLastExportedAt] = useState<string | null>(null);
  const { t } = useTranslation();

  const handleExport = useCallback(async () => {
    if (!sessionId) return;
    setExportState('loading');
    setExportError('');

    try {
      const res = await fetch(`/api/session/${sessionId}/export`);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const payload = await res.json();

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `entitygraph-session-${sessionId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setLastExportedAt(new Date().toLocaleString());
      setExportState('done');
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Unknown error');
      setExportState('error');
    }
  }, [sessionId]);

  return (
    <SectionCard
      title={t('export.title')}
      description={t('export.desc')}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <button
          id="export-session-btn"
          onClick={handleExport}
          disabled={!sessionId || exportState === 'loading'}
          style={{
            padding: '0.625rem 1.5rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            background: (!sessionId || exportState === 'loading') ? 'rgba(255,255,255,0.05)' : 'var(--color-primary)',
            color: (!sessionId || exportState === 'loading') ? 'var(--color-text-muted)' : 'var(--color-on-primary)',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            cursor: (!sessionId || exportState === 'loading') ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.15s ease-in-out',
          }}
          onMouseEnter={(e) => { if (sessionId && exportState !== 'loading') e.currentTarget.style.opacity = '0.85'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
        >
          {exportState === 'loading' ? <Spinner size={14} /> : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          )}
          {t('export.download_btn')}
        </button>
 
        <StatusBadge state={exportState} errorMsg={exportError} />
      </div>
 
      {lastExportedAt && exportState === 'done' && (
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>
          {t('export.last_exported', { time: lastExportedAt })}
        </p>
      )}
      {exportState === 'error' && (
        <p style={{ fontSize: '0.75rem', color: 'var(--color-error)', margin: 0 }}>{t('export.error_prefix')}{exportError}</p>
      )}
 
      {/* JSON format preview */}
      <div style={{ background: 'var(--bg-base)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '1rem', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', lineHeight: 1.7 }}>
        <span style={{ color: 'var(--color-secondary)' }}>{'{'}</span><br />
        {'  '}<span style={{ color: '#3fa9f5' }}>&quot;sessionId&quot;</span>: <span style={{ color: '#10B981' }}>&quot;uuid&quot;</span>,<br />
        {'  '}<span style={{ color: '#3fa9f5' }}>&quot;exportedAt&quot;</span>: <span style={{ color: '#10B981' }}>&quot;ISO timestamp&quot;</span>,<br />
        {'  '}<span style={{ color: '#3fa9f5' }}>&quot;windowSize&quot;</span>: <span style={{ color: 'var(--color-primary)' }}>400</span>,<br />
        {'  '}<span style={{ color: '#3fa9f5' }}>&quot;nodes&quot;</span>: [<span style={{ color: 'var(--color-text-muted)' }}> … entities with occurrences </span>],<br />
        {'  '}<span style={{ color: '#3fa9f5' }}>&quot;edges&quot;</span>: [<span style={{ color: 'var(--color-text-muted)' }}> … co-occurrence edges </span>],<br />
        {'  '}<span style={{ color: '#3fa9f5' }}>&quot;emails&quot;</span>: [<span style={{ color: 'var(--color-text-muted)' }}> … email thread records </span>]<br />
        <span style={{ color: 'var(--color-secondary)' }}>{'}'}</span>
      </div>
    </SectionCard>
  );
}
