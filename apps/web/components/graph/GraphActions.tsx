'use client';

import { useState } from 'react';
import type { CSSProperties } from 'react';
import Button from '@/components/ui/Button';
import InfoHint from '@/components/ui/InfoHint';
import { UploadedFile } from '@/store/uploadStore';
import ExportModal from '@/components/graph/ExportModal';
import HiddenNodesModal from '@/components/graph/HiddenNodesModal';
import { useSWRConfig } from 'swr';
import { useTranslation } from '@/lib/i18n';
import { useGraphStore } from '@/store/graphStore';
import { ALL_ENTITY_TYPES } from '@/lib/stats-utils';

interface Props {
  sessionId: string | null;
  isResettingGraph?: boolean;
  onResetFilters: () => void;
  onResetGraph: () => void;
  onExplodeGraph: () => void;
  onImportSuccess: (newSessionId: string | null, files: UploadedFile[]) => void;
}

type ExportType = 'json' | 'obsidian' | 'graphml';
type ImportType = 'json' | 'graphml';

const gridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 };
const sectionStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8 };
const sectionHeaderStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' };

function SectionHeader({ title, help }: { title: string; help?: string }) {
  return (
    <div style={sectionHeaderStyle}>
      <span>{title}</span>
      {help && <InfoHint title={title} body={help} placement="top" align="left" panelWidth={270} idleOpacity={0.55} />}
    </div>
  );
}

export default function GraphActions({ sessionId, isResettingGraph, onResetFilters, onResetGraph, onExplodeGraph, onImportSuccess }: Props) {
  const { t } = useTranslation();
  const [exportModalType, setExportModalType] = useState<ExportType | null>(null);
  const [showHiddenNodesModal, setShowHiddenNodesModal] = useState(false);
  const [importingType, setImportingType] = useState<ImportType | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const { mutate } = useSWRConfig();
  const activeView = useGraphStore((s) => s.activeView);
  const setFilter = useGraphStore((s) => s.setFilter);

  const openImportPicker = (type: ImportType) => {
    setImportError(null);
    document.getElementById(`import-graph-${type}-input`)?.click();
  };

  const importJson = async (file: File) => {
    let parsed: { nodes?: unknown; edges?: unknown; windowSize?: unknown };
    try { parsed = JSON.parse(await file.text()); }
    catch { throw new Error(t('graph.controls.err_invalid_json')); }
    if (!parsed.nodes || !parsed.edges) throw new Error(t('graph.controls.err_invalid_structure'));

    return fetch('/api/session/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sessionId || null, nodes: parsed.nodes, edges: parsed.edges, windowSize: typeof parsed.windowSize === 'number' ? parsed.windowSize : 400 }),
    });
  };

  const importGraphml = async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    if (sessionId) form.append('sessionId', sessionId);
    return fetch('/api/graph/import', { method: 'POST', body: form });
  };

  const handleFileChange = (type: ImportType) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportingType(type);
    setImportError(null);
    try {
      const res = type === 'json' ? await importJson(file) : await importGraphml(file);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || t(type === 'json' ? 'graph.controls.err_import_failed' : 'graph.controls.err_import_graphml_failed'));
      }
      const data = await res.json();
      if (type === 'graphml') {
        setFilter('minConnections', 0);
        setFilter('minOccurrences', 1);
        setFilter('minTfidf', 0);
        setFilter('minEdgeWeight', 0);
        setFilter('crossDocumentOnly', false);
        setFilter('entityTypes', ALL_ENTITY_TYPES);
      }
      onImportSuccess(data.sessionId ?? null, data.files ?? []);
    } catch (err: unknown) {
      console.error('Import failed', err);
      setImportError(err instanceof Error ? err.message : t('graph.controls.err_unknown_import'));
    } finally {
      setImportingType(null);
      e.target.value = '';
    }
  };

  return (
    <div className="graph-actions" style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 6 }}>
      <div style={sectionStyle}>
        <SectionHeader title={t('graph.actions.files_title')} help={t('graph.actions.files_help')} />
        <div style={gridStyle}>
          <Button id="save-session-export" variant="secondary" size="xs" onClick={() => setExportModalType('json')} disabled={!sessionId}>{t('graph.controls.btn_save_json')}</Button>
          <Button id="import-session-json" variant="secondary" size="xs" onClick={() => openImportPicker('json')} loading={importingType === 'json'}>{t('graph.controls.btn_import_json')}</Button>
          <Button id="save-session-graphml" variant="secondary" size="xs" onClick={() => setExportModalType('graphml')} disabled={!sessionId}>{t('graph.controls.btn_export_graphml')}</Button>
          <Button id="import-session-graphml" variant="secondary" size="xs" onClick={() => openImportPicker('graphml')} loading={importingType === 'graphml'}>{t('graph.controls.btn_import_graphml')}</Button>
          <Button id="save-session-obsidian" variant="secondary" size="xs" onClick={() => setExportModalType('obsidian')} disabled={!sessionId}>{t('graph.controls.btn_export_obsidian')}</Button>
          <Button id="show-hidden-nodes" variant="secondary" size="xs" onClick={() => setShowHiddenNodesModal(true)} disabled={!sessionId}>{t('graph.controls.btn_hidden_nodes')}</Button>
        </div>
      </div>

      <div style={sectionStyle}>
        <SectionHeader title={t('graph.actions.tools_title')} />
        <div style={gridStyle}>
          <Button id="reset-graph-filters" variant="secondary" size="xs" onClick={onResetFilters}>{t('graph.controls.btn_reset_view')}</Button>
          {activeView === 'graph' && <Button id="explode-graph" variant="primary" size="xs" onClick={onExplodeGraph}>{t('graph.controls.btn_explode_graph')}</Button>}
        </div>
      </div>

      <input id="import-graph-json-input" type="file" accept=".json,application/json" onChange={handleFileChange('json')} style={{ display: 'none' }} />
      <input id="import-graph-graphml-input" type="file" accept=".graphml,.xml,application/xml,text/xml,application/graphml+xml" onChange={handleFileChange('graphml')} style={{ display: 'none' }} />
      {importError && <span style={{ fontSize: '0.72rem', color: 'var(--error)', display: 'block', textAlign: 'center' }}>{importError}</span>}
      <Button id="reset-graph-data" variant="ghost" size="xs" onClick={onResetGraph} loading={isResettingGraph} style={{ color: 'var(--error)' }}>
        {isResettingGraph ? t('graph.controls.deleting_graph') : t('graph.controls.btn_reset_graph')}
      </Button>

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
