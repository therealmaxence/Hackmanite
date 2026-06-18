'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import { UploadedFile } from '@/store/uploadStore';
import ExportModal from '@/components/graph/ExportModal';
import HiddenNodesModal from '@/components/graph/HiddenNodesModal';
import { useSWRConfig } from 'swr';
import { useTranslation } from '@/lib/i18n';

import { useGraphStore } from '@/store/graphStore';

interface Props {
  sessionId: string | null;
  onResetFilters: () => void;
  onResetGraph: () => void;
  onExplodeGraph: () => void;
  onImportSuccess: (newSessionId: string | null, files: UploadedFile[]) => void;
}

export default function GraphActions({ sessionId, onResetFilters, onResetGraph, onExplodeGraph, onImportSuccess }: Props) {
  const { t } = useTranslation();
  const [exportModalType, setExportModalType] = useState<'json' | 'obsidian' | null>(null);
  const [showHiddenNodesModal, setShowHiddenNodesModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const { mutate } = useSWRConfig();
  const activeView = useGraphStore((s) => s.activeView);

  const handleSave = () => {
    setExportModalType('json');
  };

  const handleSaveObsidian = () => {
    setExportModalType('obsidian');
  };

  const handleImportClick = () => {
    setImportError(null);
    document.getElementById('import-graph-file-input')?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    setImportError(null);
    try {
      let parsed: { nodes?: unknown; edges?: unknown; windowSize?: unknown };
      try { parsed = JSON.parse(await file.text()); }
      catch { throw new Error(t('graph.controls.err_invalid_json')); }

      if (!parsed.nodes || !parsed.edges) {
        throw new Error(t('graph.controls.err_invalid_structure'));
      }

      const res = await fetch('/api/session/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionId || null, nodes: parsed.nodes, edges: parsed.edges, windowSize: typeof parsed.windowSize === 'number' ? parsed.windowSize : 400 }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || t('graph.controls.err_import_failed'));
      }
      const data = await res.json();
      onImportSuccess(data.sessionId ?? null, data.files ?? []);
    } catch (err: unknown) {
      console.error('Import failed', err);
      setImportError(err instanceof Error ? err.message : t('graph.controls.err_unknown_import'));
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div className="graph-actions" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Button id="save-session-export" variant="secondary" size="xs" onClick={handleSave} disabled={!sessionId}>{t('graph.controls.btn_save_json')}</Button>
        <Button id="import-session-json" variant="secondary" size="xs" onClick={handleImportClick} loading={isImporting}>{t('graph.controls.btn_import_json')}</Button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Button id="save-session-obsidian" variant="secondary" size="xs" onClick={handleSaveObsidian} disabled={!sessionId}>{t('graph.controls.btn_export_obsidian')}</Button>
        <Button id="show-hidden-nodes" variant="secondary" size="xs" onClick={() => setShowHiddenNodesModal(true)} disabled={!sessionId}>{t('graph.controls.btn_hidden_nodes')}</Button>
      </div>
      <input id="import-graph-file-input" type="file" accept=".json" onChange={handleFileChange} style={{ display: 'none' }} />
      {importError && <span style={{ fontSize: '0.72rem', color: 'var(--error)', marginTop: 4, display: 'block', textAlign: 'center' }}>{importError}</span>}
      {activeView === 'graph' && (
        <Button
          id="explode-graph"
          variant="primary"
          size="xs"
          onClick={onExplodeGraph}
          leftIcon={
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <circle cx="3" cy="16" r="2" />
              <circle cx="21" cy="8" r="2" />
              <circle cx="18" cy="19" r="2" />
              <circle cx="6" cy="6" r="2" />
              <path d="M5 15l4.5-2M19 9l-4.5 2M16.5 17.5L13.5 14M7.5 7.5L10.5 10" />
            </svg>
          }
          style={{ width: '100%', marginTop: 4 }}
        >
          {t('graph.controls.btn_explode_graph')}
        </Button>
      )}
      <Button id="reset-graph-filters" variant="ghost" size="xs" onClick={onResetFilters}>{t('graph.controls.btn_reset_view')}</Button>
      <Button id="reset-graph-data" variant="ghost" size="xs" onClick={onResetGraph} style={{ color: 'var(--error)' }}>{t('graph.controls.btn_reset_graph')}</Button>

      {exportModalType && sessionId && (
        <ExportModal
          sessionId={sessionId}
          exportType={exportModalType}
          onClose={() => setExportModalType(null)}
        />
      )}

      {showHiddenNodesModal && sessionId && (
        <HiddenNodesModal
          sessionId={sessionId}
          onClose={() => setShowHiddenNodesModal(false)}
          onUnhideSuccess={() => {
            mutate((key: unknown) => typeof key === 'string' && (key.includes('/api/graph/') || key.includes('/api/stats')));
          }}
        />
      )}
    </div>
  );
}
