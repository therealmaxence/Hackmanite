'use client';

import { useState } from 'react';
import { useSWRConfig } from 'swr';
import { useUploadStore } from '@/store/uploadStore';
import Button from '@/components/ui/Button';
import exportSessionAsJson from '@/lib/sessionExport';
import { useTranslation } from '@/lib/i18n';
import { ActiveTab, LayoutType } from './types';

interface FiltersPanelProps {
  searchQuery: string; onSearchChange: (v: string) => void;
  senderFilter: string; onSenderChange: (v: string) => void;
  recipientFilter: string; onRecipientChange: (v: string) => void;
  filterOptions: { senders: string[]; recipients: string[] };
  focusedThreadRootId: string | null; onResetFocus: () => void;
  activeTab: ActiveTab; onTabChange: (tab: ActiveTab) => void;
  layoutType: LayoutType; onLayoutChange: (layout: LayoutType) => void;
}

const inputStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem', fontSize: '0.8125rem', background: 'var(--color-surface-input)',
  border: 'none', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)',
  outline: 'none', transition: 'all var(--transition-fast)', width: '100%',
};

export default function FiltersPanel({
  searchQuery, onSearchChange, senderFilter, onSenderChange, recipientFilter, onRecipientChange,
  filterOptions, focusedThreadRootId, onResetFocus, activeTab, onTabChange, layoutType, onLayoutChange
}: FiltersPanelProps) {
  const { sessionId, setSessionId, addFiles } = useUploadStore();
  const { mutate } = useSWRConfig();
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const handleSaveExport = async () => {
    if (!sessionId) return;
    try {
      setIsSaving(true);
      await exportSessionAsJson(sessionId);
    } catch (err) {
      console.error('Failed to export session', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    setImportError(null);

    try {
      const text = await file.text();
      let parsedData;
      try { parsedData = JSON.parse(text); } catch { throw new Error(t('graph.controls.err_invalid_json')); }
      if (!parsedData.nodes || !parsedData.edges) throw new Error(t('graph.controls.err_invalid_structure'));

      const response = await fetch('/api/session/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId || null,
          nodes: parsedData.nodes,
          edges: parsedData.edges,
          emails: parsedData.emails || null,
          windowSize: typeof parsedData.windowSize === 'number' ? parsedData.windowSize : 400,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || t('graph.controls.err_import_failed'));
      }

      const resData = await response.json();
      if (!sessionId && resData.sessionId) setSessionId(resData.sessionId);
      if (Array.isArray(resData.files)) addFiles(resData.files);
      mutate((key) => typeof key === 'string' && (key.includes('/api/emails') || key.includes('/api/graph/')));
    } catch (err: any) {
      console.error('Import failed', err);
      setImportError(err.message || t('graph.controls.err_unknown_import'));
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.target.style.background = 'var(--color-surface-hover)';
    e.target.style.boxShadow = 'var(--glow-trace)';
  };
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.target.style.background = 'var(--color-surface-input)';
    e.target.style.boxShadow = 'none';
  };

  return (
    <div style={{ width: '280px', background: 'var(--color-surface)', display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.25rem', overflowY: 'auto', flexShrink: 0 }}>
      <div>
        <h3 style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.875rem' }}>{t('emails.filters.title')}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{t('emails.filters.search')}</label>
          <input type="text" placeholder={t('emails.filters.search_placeholder')} value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} style={inputStyle} onFocus={handleFocus} onBlur={handleBlur} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{t('emails.filters.from')}</label>
          <select value={senderFilter} onChange={(e) => onSenderChange(e.target.value)} style={inputStyle} onFocus={handleFocus} onBlur={handleBlur}>
            <option value="all">{t('emails.filters.from_all')}</option>
            {filterOptions.senders.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{t('emails.filters.to')}</label>
          <select value={recipientFilter} onChange={(e) => onRecipientChange(e.target.value)} style={inputStyle} onFocus={handleFocus} onBlur={handleBlur}>
            <option value="all">{t('emails.filters.to_all')}</option>
            {filterOptions.recipients.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        {focusedThreadRootId && (
          <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'color-mix(in srgb, var(--color-info) 12%, var(--color-surface-raised))', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-info)', margin: 0 }}>{t('emails.filters.focused_active')}</p>
            <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', margin: 0 }}>{t('emails.filters.focused_desc')}</p>
            <button onClick={onResetFocus} style={{ alignSelf: 'flex-start', marginTop: '0.25rem', background: 'transparent', border: 'none', color: 'var(--color-text)', fontSize: '0.75rem', textDecoration: 'underline', padding: 0, cursor: 'pointer' }}>{t('emails.filters.reset_focus')}</button>
          </div>
        )}
      </div>

      <div>
        <h3 style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>{t('emails.filters.vis_options')}</h3>
        <div style={{ display: 'flex', background: 'var(--color-surface-input)', padding: '3px', borderRadius: 'var(--radius)', border: 'none', marginBottom: '1rem' }}>
          {(['graph', 'list'] as ActiveTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              style={{
                flex: 1, padding: '0.375rem 0', fontSize: '0.8125rem',
                background: activeTab === tab ? 'var(--color-primary)' : 'transparent',
                color: activeTab === tab ? 'var(--color-on-primary)' : 'var(--color-text)',
                border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 500, transition: 'background 0.15s ease-in-out',
              }}
            >
              {tab === 'graph' ? t('emails.filters.tab_graph') : t('emails.filters.tab_list')}
            </button>
          ))}
        </div>
        {activeTab === 'graph' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{t('emails.filters.graph_layout')}</label>
            <select value={layoutType} onChange={(e) => onLayoutChange(e.target.value as LayoutType)} style={inputStyle} onFocus={handleFocus} onBlur={handleBlur}>
              <option value="breadthfirst">{t('emails.filters.layout_tree')}</option>
              <option value="cose-bilkent">{t('emails.filters.layout_force')}</option>
            </select>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', borderTop: 'none', paddingTop: '1.25rem', marginTop: 'auto' }}>
        <h3 style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{t('emails.filters.session_actions')}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: '0.25rem' }}>
          <Button id="save-session-export" variant="secondary" size="xs" onClick={handleSaveExport} disabled={!sessionId} loading={isSaving}>{t('graph.controls.btn_save_json')}</Button>
          <Button id="import-session-json" variant="secondary" size="xs" onClick={() => document.getElementById('import-email-file-input')?.click()} loading={isImporting}>{t('graph.controls.btn_import_json')}</Button>
        </div>
        <input id="import-email-file-input" type="file" accept=".json" onChange={handleFileChange} style={{ display: 'none' }} />
        {importError && <span style={{ fontSize: '0.72rem', color: 'var(--error)', marginTop: 4, display: 'block', textAlign: 'center' }}>{importError}</span>}
      </div>
    </div>
  );
}

