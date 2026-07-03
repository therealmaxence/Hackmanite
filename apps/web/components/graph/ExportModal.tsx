'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { downloadJsonData, downloadGraphmlData } from '@/lib/sessionExport';
import { generateAndDownloadObsidianZip } from '@/lib/obsidianExport';
import { filterGraphExportData } from '@/lib/export-filter';
import { useTranslation } from '@/lib/i18n';

interface ExportModalProps {
  sessionId: string;
  exportType: 'json' | 'obsidian' | 'graphml';
  onClose: () => void;
}

export default function ExportModal({ sessionId, exportType, onClose }: ExportModalProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawData, setRawData] = useState<any | null>(null);

  const [allTypes, setAllTypes] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [keepAllNodes, setKeepAllNodes] = useState(true);
  const [limitNodes, setLimitNodes] = useState(100);
  const [minOccurrences, setMinOccurrences] = useState(1);
  const [minTfidf, setMinTfidf] = useState(0.0);
  const [minConnections, setMinConnections] = useState(0);
  const [minEdgeWeight, setMinEdgeWeight] = useState(0.0);
  const [exportHiddenNodes, setExportHiddenNodes] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/session/${sessionId}/export`)
      .then((res) => {
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!active) return;
        setRawData(data);
        const types = Array.from(new Set<string>((data.nodes || []).map((n: any) => n.type)));
        setAllTypes(types);
        setSelectedTypes(new Set(types));
        setIsLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        console.error('Failed to load session export', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch graph data');
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [sessionId]);

  const handleToggleType = (type: string) => {
    const next = new Set(selectedTypes);
    if (next.has(type)) {
      next.delete(type);
    } else {
      next.add(type);
    }
    setSelectedTypes(next);
  };

  const handleSelectAllTypes = () => {
    setSelectedTypes(new Set(allTypes));
  };

  const handleSelectNoneTypes = () => {
    setSelectedTypes(new Set());
  };

  const handleExportSubmit = async () => {
    if (!rawData) return;
    setIsProcessing(true);
    setError(null);

    try {
      const filteredPayload = filterGraphExportData(rawData, {
        selectedTypes,
        keepAllNodes,
        limitNodes,
        minOccurrences,
        minTfidf,
        minConnections,
        minEdgeWeight,
        exportHiddenNodes,
      });

      if (exportType === 'json') {
        downloadJsonData(filteredPayload, sessionId);
      } else if (exportType === 'graphml') {
        downloadGraphmlData(filteredPayload, sessionId);
      } else {
        await generateAndDownloadObsidianZip(filteredPayload, sessionId);
      }

      onClose();
    } catch (err: unknown) {
      console.error('Filtering/Export failed', err);
      setError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(18, 1, 8, 0.82)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius)',
          width: '90%',
          maxWidth: 480,
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.6)',
          animation: 'fadeIn 0.25s ease-out',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--color-text)' }}>
            {t('graph.export.title')}
          </h2>
          <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
            {t('graph.export.format_prefix')}{' '}
            {exportType === 'json' ? t('graph.export.format_json') : exportType === 'graphml' ? 'GraphML' : t('graph.export.format_obsidian')}
          </span>
        </div>

        {/* Content */}
        <div style={{ padding: 24, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }} className="custom-scrollbar">
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 }}>
              <Spinner size={24} />
              <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                {t('graph.export.loading')}
              </span>
            </div>
          ) : error ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, color: 'var(--color-error)' }}>
              <span style={{ fontSize: '0.875rem' }}>⚠ {error}</span>
              <Button size="sm" onClick={onClose} variant="ghost" style={{ alignSelf: 'center' }}>
                {t('graph.export.btn_cancel')}
              </Button>
            </div>
          ) : (
            <>
              {/* Node Pruning (Top N Nodes) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text)' }}>{t('graph.export.node_pruning')}</span>
                <div style={{ display: 'flex', gap: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: 'var(--color-text)', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      checked={keepAllNodes}
                      onChange={() => setKeepAllNodes(true)}
                      style={{ accentColor: 'var(--color-primary)' }}
                    />
                    {t('graph.export.keep_all')}
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: 'var(--color-text)', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      checked={!keepAllNodes}
                      onChange={() => setKeepAllNodes(false)}
                      style={{ accentColor: 'var(--color-primary)' }}
                    />
                    {t('graph.export.limit_top')}
                  </label>
                </div>
                {!keepAllNodes && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{t('graph.export.keep_top_prefix')}</span>
                    <input
                      type="number"
                      min="1"
                      value={limitNodes}
                      onChange={(e) => setLimitNodes(Math.max(1, parseInt(e.target.value) || 1))}
                      className="signature-input"
                      style={{ width: 100, height: 36, padding: '0 10px' }}
                    />
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{t('graph.export.keep_top_suffix')}</span>
                  </div>
                )}
              </div>

              {/* Export Hidden Nodes Toggle */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text)' }}>{t('graph.export.hidden_nodes_option')}</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: 'var(--color-text)', cursor: 'pointer', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={exportHiddenNodes}
                    onChange={(e) => setExportHiddenNodes(e.target.checked)}
                    style={{ accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                  />
                  {t('graph.export.hidden_nodes_checkbox')}
                </label>
              </div>

              {/* Sliders and Numerical Filters */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label htmlFor="modal-min-occ-input" style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('graph.export.min_occs')}</label>
                  <input
                    id="modal-min-occ-input"
                    type="number"
                    min="1"
                    value={minOccurrences}
                    onChange={(e) => setMinOccurrences(Math.max(1, parseInt(e.target.value) || 1))}
                    className="signature-input"
                    style={{ height: 38, width: '100%', padding: '0 8px' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label htmlFor="modal-min-conn-input" style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('graph.export.min_conns')}</label>
                  <input
                    id="modal-min-conn-input"
                    type="number"
                    min="0"
                    value={minConnections}
                    onChange={(e) => setMinConnections(Math.max(0, parseInt(e.target.value) || 0))}
                    className="signature-input"
                    style={{ height: 38, width: '100%', padding: '0 8px' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label htmlFor="modal-min-tfidf-input" style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('graph.export.min_tfidf')}</label>
                  <input
                    id="modal-min-tfidf-input"
                    type="number"
                    min="0"
                    step="0.1"
                    value={minTfidf}
                    onChange={(e) => setMinTfidf(Math.max(0.0, parseFloat(e.target.value) || 0.0))}
                    className="signature-input"
                    style={{ height: 38, width: '100%', padding: '0 8px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                  <label htmlFor="modal-min-weight-input" style={{ fontWeight: 500 }}>{t('graph.export.min_weight')}</label>
                  <span>{minEdgeWeight.toFixed(2)}</span>
                </div>
                <input
                  id="modal-min-weight-input"
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.01"
                  value={minEdgeWeight}
                  onChange={(e) => setMinEdgeWeight(parseFloat(e.target.value))}
                  style={{ accentColor: 'var(--color-primary)', width: '100%', cursor: 'pointer', marginTop: 4 }}
                />
              </div>

              {/* Entity Type Selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text)' }}>{t('graph.export.filter_by_type')}</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleSelectAllTypes} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 500 }}>{t('graph.export.select_all')}</button>
                    <span style={{ color: 'var(--color-border)', fontSize: '0.72rem' }}>|</span>
                    <button onClick={handleSelectNoneTypes} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 500 }}>{t('graph.export.select_none')}</button>
                  </div>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 8,
                    background: '#120108',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius)',
                    padding: 12,
                    maxHeight: 120,
                    overflowY: 'auto',
                  }}
                  className="custom-scrollbar"
                >
                  {allTypes.length === 0 ? (
                    <span style={{ gridColumn: 'span 2', fontSize: '0.78rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>{t('graph.export.no_types')}</span>
                  ) : (
                    allTypes.map((type) => (
                      <label key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: selectedTypes.has(type) ? 'var(--color-text)' : 'var(--color-text-muted)', cursor: 'pointer', userSelect: 'none' }}>
                        <input
                          type="checkbox"
                          checked={selectedTypes.has(type)}
                          onChange={() => handleToggleType(type)}
                          style={{ accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                        />
                        {type}
                      </label>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: 18, borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <Button size="sm" variant="ghost" onClick={onClose} disabled={isProcessing}>
            {t('graph.export.btn_cancel')}
          </Button>
          {!isLoading && !error && (
            <Button
              size="sm"
              variant="primary"
              onClick={handleExportSubmit}
              loading={isProcessing}
              disabled={selectedTypes.size === 0}
            >
              {t('graph.export.btn_export')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
