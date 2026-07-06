import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Button from '@/components/ui/Button';
import { ENTITY_COLORS, EntityType } from '@/types/entities';
import { ALL_ENTITY_TYPES } from '@/lib/stats-utils';
import { useTranslation } from '@/lib/i18n';
import { useUploadStore } from '@/store/uploadStore';
import { createPortal } from 'react-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

function getTimelineData(testData: any) {
  const nodes = testData?.nodes || [];
  const groups: Record<string, number> = {};
  for (const node of nodes) {
    for (const occ of node.occurrences || []) {
      if (occ.originalCreatedAt) {
        try {
          const dateStr = new Date(occ.originalCreatedAt).toISOString().split('T')[0];
          groups[dateStr] = (groups[dateStr] || 0) + (occ.count || 1);
        } catch (_) {}
      }
    }
  }
  return Object.keys(groups).map((date) => ({
    date,
    Mentions: groups[date],
  })).sort((a, b) => a.date.localeCompare(b.date));
}

const GraphCanvas = dynamic(
  () => import('@/components/graph/GraphCanvas'),
  { ssr: false, loading: () => <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>Loading graph viewer...</div> }
);

const EntityTableView = dynamic(
  () => import('@/components/graph/EntityTableView'),
  { ssr: false, loading: () => <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>Loading table viewer...</div> }
);

interface NodeConfigDrawerProps {
  selectedNode: any;
  selectedPipelineId: string | null;
  handleConfigChange: (key: string, val: any) => void;
  handleLabelChange: (val: string) => void;
  handleDeleteNode: () => void;
}

const sectionLabelStyle: React.CSSProperties = {
  fontSize: '0.6875rem',
  fontWeight: 700,
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const fieldLabelStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--color-text-muted)',
  fontWeight: 500,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  marginTop: '0.375rem',
  padding: '0.5rem 0.75rem',
  fontSize: '0.8125rem',
  background: 'var(--color-surface-input)',
  border: '1px solid var(--color-surface-raised)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--color-text)',
  outline: 'none',
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  fontFamily: 'var(--font-mono)',
};

const dimTextStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--color-text-dim)',
  margin: '0.25rem 0',
};

const divider = <div style={{ width: '100%', height: '1px', background: 'var(--color-surface-raised)', margin: '0.5rem 0' }} />;

function triggerDownload(fileName: string, content: string, mimeType: string, isBase64?: boolean) {
  let blob: Blob;
  if (isBase64) {
    const binaryString = window.atob(content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    blob = new Blob([bytes], { type: mimeType || 'application/octet-stream' });
  } else {
    blob = new Blob([content], { type: mimeType || 'text/plain' });
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function formatDryRunOutput(outputData: any) {
  if (!outputData) return outputData;

  switch (outputData.type) {
    case 'file_download': {
      const { fileName, content, mimeType, isBase64, relativePath } = outputData.value || {};
      if (relativePath) {
        const link = document.createElement('a');
        link.href = `/api/pipelines/download?path=${encodeURIComponent(relativePath)}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else if (fileName && content) {
        triggerDownload(fileName, content, mimeType, isBase64);
      }
      return {
        type: 'file_download',
        fileName: fileName || 'export.file',
        mimeType: mimeType || 'application/octet-stream',
        sizeBytes: content ? (isBase64 ? Math.round(content.length * 0.75) : content.length) : 0,
      };
    }
    case 'graph':
      return { type: 'graph', nodes: outputData.nodes || [], edges: outputData.edges || [] };
    case 'tabular':
      return { type: 'tabular', data: outputData.data || [] };
    default:
      return outputData;
  }
}

async function runDryRun(pipelineId: string, nodeId: string) {
  const res = await fetch(`/api/pipelines/${pipelineId}/dry-run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nodeId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Execution failed');
  }

  return formatDryRunOutput(await res.json());
}

interface FileSourceFieldsProps {
  selectLabel: string;
  emptyOption: string;
  uploadLabel: string;
  inputId: string;
  accept?: string;
  files: any[];
  loadingFiles: boolean;
  config: any;
  handleConfigChange: (key: string, val: any) => void;
  isUploading: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function FileSourceFields({
  selectLabel,
  emptyOption,
  uploadLabel,
  inputId,
  accept,
  files,
  loadingFiles,
  config,
  handleConfigChange,
  isUploading,
  onUpload,
}: FileSourceFieldsProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div>
        <label style={fieldLabelStyle}>{selectLabel}</label>
        {loadingFiles ? (
          <p style={dimTextStyle}>Loading files...</p>
        ) : (
          <select
            value={config.filePath || ''}
            onChange={(e) => {
              handleConfigChange('fileIds', []);
              handleConfigChange('filePath', e.target.value);
            }}
            style={inputStyle}
          >
            <option value="">{emptyOption}</option>
            {files.map((file) => (
              <option key={file.fileId} value={file.originalName}>
                {file.originalName}{file.mimeType ? ` (${file.mimeType.split('/').pop()})` : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        <label style={fieldLabelStyle}>{uploadLabel}</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input type="file" id={inputId} accept={accept} multiple={!accept} style={{ display: 'none' }} onChange={onUpload} disabled={isUploading} />
          <Button variant="secondary" size="sm" onClick={() => document.getElementById(inputId)?.click()} loading={isUploading} style={{ flex: 1, minHeight: '34px' }}>
            {isUploading ? 'Uploading...' : 'Choose Files'}
          </Button>
        </div>
      </div>

      <div>
        <label style={fieldLabelStyle}>Active Path / Name</label>
        <input
          type="text"
          value={config.filePath || ''}
          onChange={(e) => {
            handleConfigChange('fileIds', []);
            handleConfigChange('filePath', e.target.value);
          }}
          placeholder="Or input custom path manually..."
          style={inputStyle}
        />
      </div>

      <div>
        <label style={fieldLabelStyle}>Extraction Window Size</label>
        <input
          type="number"
          min={1}
          max={10000}
          value={config.windowSize ?? 400}
          onChange={(e) => handleConfigChange('windowSize', Math.max(1, parseInt(e.target.value, 10) || 1))}
          style={inputStyle}
        />
      </div>
    </div>
  );
}

function toGraphViewData(data: any) {
  const nodes = (data.nodes || []).map((node: any) => {
    const occurrences = node.occurrences || [];
    const totalOccurrences = occurrences.reduce((acc: number, curr: any) => acc + (curr.count || 1), 0);
    return {
      id: node.id,
      label: node.label || node.displayName || '',
      type: node.type || 'PERSON',
      fileCount: occurrences.length || 1,
      totalOccurrences: totalOccurrences || 1,
      tfidf: node.tfidf ?? totalOccurrences,
      color: node.color || ENTITY_COLORS[(node.type || 'PERSON') as EntityType] || '#7c3aed',
    };
  });
  const edges = (data.edges || []).map((edge: any) => ({ source: edge.source, target: edge.target, weight: edge.weight ?? 1 }));
  return { nodes, edges };
}

function GraphPreview({ data, view: View }: { data: any; view: any }) {
  const graph = toGraphViewData(data);
  return <View nodes={graph.nodes} edges={graph.edges} isStandalone={true} />;
}

export default function NodeConfigDrawer({
  selectedNode,
  selectedPipelineId,
  handleConfigChange,
  handleLabelChange,
  handleDeleteNode,
}: NodeConfigDrawerProps) {
  const { t } = useTranslation();
  const { sessionId, setSessionId } = useUploadStore();
  const [testing, setTesting] = useState(false);
  const [testData, setTestData] = useState<any>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [showVisualizerModal, setShowVisualizerModal] = useState(false);

  const [sessionFiles, setSessionFiles] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fetchSessionFiles = async () => {
    setLoadingFiles(true);
    try {
      const res = await fetch('/api/session');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setSessions(data);
          setSessionFiles(
            data.flatMap((session: any) => (session.files || []).map((f: any) => ({ ...f, sessionId: session.id })))
          );
        }
      }
    } catch (e) {
      console.error('Failed to fetch session files:', e);
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    fetchSessionFiles();
  }, []);

  useEffect(() => {
    setTestData(null);
    setTestError(null);
  }, [selectedNode.id]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetFiles = e.target.files;
    if (!targetFiles || targetFiles.length === 0) return;

    setIsUploading(true);
    try {
      const form = new FormData();
      for (let i = 0; i < targetFiles.length; i++) form.append('files', targetFiles[i]);
      form.append('pipelineOnly', 'true');
      if (sessionId) form.append('sessionId', sessionId);

      const res = await fetch('/api/upload', { method: 'POST', body: form });
      if (!res.ok) throw new Error((await res.json()).error || 'Upload failed');

      const data = await res.json();
      const activeSessionId = data.sessionId || sessionId;
      if (!sessionId && data.sessionId) setSessionId(data.sessionId);

      if (data.jobs && data.jobs.length > 0) {
        await fetchSessionFiles();

        handleConfigChange(
          'filePath',
          targetFiles.length > 1 && activeSessionId ? `uploads/${activeSessionId}` : data.jobs[0].originalName
        );
        handleConfigChange('fileIds', data.jobs.map((job: any) => job.fileId));
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const runTest = async (openModalOnSuccess: boolean) => {
    if (!selectedPipelineId) {
      setTestError('Please save the pipeline before testing.');
      return;
    }

    setTesting(true);
    setTestData(null);
    setTestError(null);
    try {
      const formatted = await runDryRun(selectedPipelineId, selectedNode.id);
      setTestData(formatted);
      handleConfigChange('state', 'success');
      if (openModalOnSuccess) setShowVisualizerModal(true);
    } catch (err: any) {
      setTestError(err.message || 'Connection failed');
    } finally {
      setTesting(false);
    }
  };

  const type = selectedNode.data.type;
  const config = selectedNode.data.config || {};
  const isVisualizeNode = type === 'visualize.graph' || type === 'visualize.table';
  const isHtmlDashboard = type === 'output.html_dashboard';
  const exportLocationValue = isHtmlDashboard && (config.exportLocation || 'downloads') === 'downloads'
    ? 'custom'
    : config.exportLocation || (isHtmlDashboard ? 'custom' : 'downloads');

  const emailFiles = sessionFiles.filter(
    (f) => f.originalName.endsWith('.eml') || f.originalName.endsWith('.pst') || f.mimeType.includes('email') || f.mimeType.includes('outlook')
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <label style={sectionLabelStyle}>Node ID</label>
        <input type="text" disabled value={selectedNode.id} style={{ ...inputStyle, color: 'var(--color-text-muted)', cursor: 'default' }} />
      </div>

      <div>
        <label style={sectionLabelStyle}>Label</label>
        <input type="text" value={selectedNode.data.label} onChange={(e) => handleLabelChange(e.target.value)} style={inputStyle} />
      </div>

      {divider}

      <h4 style={{ ...sectionLabelStyle, margin: 0 }}>Parameters</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {type === 'source.sqlite.query' && (
          <div>
            <label style={fieldLabelStyle}>SQL Query</label>
            <textarea rows={6} value={config.query || ''} onChange={(e) => handleConfigChange('query', e.target.value)} style={textareaStyle} />
          </div>
        )}

        {type === 'source.kuzudb.query' && (
          <div>
            <label style={fieldLabelStyle}>Cypher Query</label>
            <textarea rows={6} value={config.query || ''} onChange={(e) => handleConfigChange('query', e.target.value)} style={textareaStyle} />
          </div>
        )}

        {type === 'source.file.document' && (
          <FileSourceFields
            selectLabel="Select File from Session"
            emptyOption="-- Choose uploaded file --"
            uploadLabel="Or Upload New Files"
            inputId="drawer-file-upload"
            files={sessionFiles}
            loadingFiles={loadingFiles}
            config={config}
            handleConfigChange={handleConfigChange}
            isUploading={isUploading}
            onUpload={handleUpload}
          />
        )}

        {type === 'source.file.email' && (
          <FileSourceFields
            selectLabel="Select Email File from Session"
            emptyOption="-- Choose uploaded email (.eml/.pst) --"
            uploadLabel="Or Upload a New Email File"
            inputId="drawer-email-upload"
            accept=".eml,.pst"
            files={emailFiles}
            loadingFiles={loadingFiles}
            config={config}
            handleConfigChange={handleConfigChange}
            isUploading={isUploading}
            onUpload={handleUpload}
          />
        )}

        {type === 'source.file.csv' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <FileSourceFields
              selectLabel="Select CSV File"
              emptyOption="-- Choose uploaded CSV --"
              uploadLabel="Or Upload New CSV File"
              inputId="drawer-csv-upload"
              accept=".csv,.tsv,.txt"
              files={sessionFiles}
              loadingFiles={loadingFiles}
              config={config}
              handleConfigChange={handleConfigChange}
              isUploading={isUploading}
              onUpload={handleUpload}
            />
            <div>
              <label style={fieldLabelStyle}>Delimiter</label>
              <input
                type="text"
                maxLength={1}
                value={config.delimiter ?? ','}
                onChange={(e) => handleConfigChange('delimiter', e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>
        )}

        {type === 'source.web.scraper' && (
          <div>
            <label style={fieldLabelStyle}>Web Page / RSS Feed URL</label>
            <input
              type="url"
              placeholder="https://example.com/feed.xml or https://example.com/article"
              value={config.url || ''}
              onChange={(e) => handleConfigChange('url', e.target.value)}
              style={inputStyle}
            />
            <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-dim)', marginTop: '0.25rem', lineHeight: 1.4 }}>
              Fetches raw HTML page text or RSS feed contents directly on the server.
            </p>
          </div>
        )}

        {type === 'source.session' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={fieldLabelStyle}>Select Active Session</label>
              {loadingFiles ? (
                <p style={dimTextStyle}>Loading sessions...</p>
              ) : (
                <select value={config.sessionId || ''} onChange={(e) => handleConfigChange('sessionId', e.target.value)} style={inputStyle}>
                  <option value="">-- Choose active session --</option>
                  {sessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.id.substring(0, 8)}... ({session.fileCount} files - {new Date(session.createdAt).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label style={fieldLabelStyle}>Active Session ID</label>
              <input
                type="text"
                value={config.sessionId || ''}
                onChange={(e) => handleConfigChange('sessionId', e.target.value)}
                placeholder="Or input custom session ID manually..."
                style={inputStyle}
              />
            </div>
          </div>
        )}

        {type === 'filter.entity_category' && (() => {
          const selected: string[] = Array.isArray(config.categories)
            ? config.categories
            : typeof config.categories === 'string' && config.categories
              ? config.categories.split(',').map((s: string) => s.trim()).filter(Boolean)
              : [];
          const toggle = (cat: string) =>
            handleConfigChange('categories', selected.includes(cat) ? selected.filter((c) => c !== cat) : [...selected, cat]);

          return (
            <div>
              <label style={fieldLabelStyle}>
                Allowed Entity Categories
                <span style={{ marginLeft: '0.5rem', color: 'var(--color-text-dim)', fontSize: '0.6875rem' }}>({selected.length} selected)</span>
              </label>
              <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                {ALL_ENTITY_TYPES.map((cat) => {
                  const active = selected.includes(cat);
                  return (
                    <button
                      key={cat}
                      onClick={() => toggle(cat)}
                      style={{
                        padding: '0.25rem 0.625rem',
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        borderRadius: 'var(--radius-sm)',
                        border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-surface-raised)'}`,
                        background: active ? 'rgba(124,58,237,0.18)' : 'var(--color-surface-input)',
                        color: active ? 'var(--color-primary-hover)' : 'var(--color-text-muted)',
                        cursor: 'pointer',
                        transition: 'all 0.12s ease',
                        userSelect: 'none',
                      }}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {type === 'filter.top_n_nodes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                <label style={fieldLabelStyle}>Keep Top N Nodes</label>
                <input
                  type="number"
                  min={1}
                  max={5000}
                  value={config.limit ?? 50}
                  onChange={(e) => handleConfigChange('limit', Math.max(1, parseInt(e.target.value) || 1))}
                  style={{ width: '72px', padding: '0.25rem 0.5rem', fontSize: '0.8125rem', textAlign: 'right', background: 'var(--color-surface-input)', border: '1px solid var(--color-surface-raised)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)', outline: 'none' }}
                />
              </div>
              <input
                type="range"
                min={1}
                max={500}
                step={1}
                value={Math.min(config.limit ?? 50, 500)}
                onChange={(e) => handleConfigChange('limit', parseInt(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--color-primary)', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: 'var(--color-text-dim)', marginTop: '0.125rem' }}>
                <span>1</span><span>250</span><span>500+</span>
              </div>
            </div>

            <div>
              <label style={{ ...fieldLabelStyle, display: 'block', marginBottom: '0.5rem' }}>Ranking Metric</label>
              <div style={{ display: 'flex', gap: '0.375rem' }}>
                {[
                  { value: 'tfidf', label: 'TF-IDF' },
                  { value: 'degree', label: 'Degree' },
                  { value: 'betweenness', label: 'Betweenness' },
                  { value: 'occurrence', label: 'Occurrence' },
                ].map(({ value, label }) => {
                  const active = (config.metric ?? 'tfidf') === value;
                  return (
                    <button
                      key={value}
                      onClick={() => handleConfigChange('metric', value)}
                      style={{
                        flex: 1,
                        padding: '0.375rem 0',
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        borderRadius: 'var(--radius-sm)',
                        border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-surface-raised)'}`,
                        background: active ? 'rgba(124,58,237,0.18)' : 'var(--color-surface-input)',
                        color: active ? 'var(--color-primary-hover)' : 'var(--color-text-muted)',
                        cursor: 'pointer',
                        transition: 'all 0.12s ease',
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {type === 'filter.min_tfidf' && (
          <div>
            <label style={fieldLabelStyle}>Minimum TF-IDF</label>
            <input
              type="number"
              min={0}
              step={0.1}
              value={config.min ?? 1}
              onChange={(e) => handleConfigChange('min', Math.max(0, Number(e.target.value) || 0))}
              style={inputStyle}
            />
          </div>
        )}

        {(type === 'filter.min_occurrences' || type === 'filter.min_connections') && (
          <div>
            <label style={fieldLabelStyle}>{type === 'filter.min_occurrences' ? 'Minimum Occurrences' : 'Minimum Connections'}</label>
            <input
              type="number"
              min={0}
              step={1}
              value={config.min ?? 2}
              onChange={(e) => handleConfigChange('min', Math.max(0, parseInt(e.target.value, 10) || 0))}
              style={inputStyle}
            />
          </div>
        )}

        {type === 'filter.edge_weight_threshold' && (
          <div>
            <label style={fieldLabelStyle}>Minimum Edge Weight</label>
            <input
              type="number"
              min={0}
              step={0.1}
              value={config.min ?? 0.1}
              onChange={(e) => handleConfigChange('min', Math.max(0, Number(e.target.value) || 0))}
              style={inputStyle}
            />
          </div>
        )}

        {type === 'filter.weak_signal_flag' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[
              ['rareBridges', 'Rare Bridges'],
              ['nicheTopics', 'Niche Topics'],
              ['spikingSignals', 'Spiking Signals'],
            ].map(([key, label]) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text)' }}>
                <input
                  type="checkbox"
                  checked={config[key] !== false}
                  onChange={(e) => handleConfigChange(key, e.target.checked)}
                  style={{ accentColor: 'var(--color-primary)', width: 14, height: 14 }}
                />
                {label}
              </label>
            ))}
          </div>
        )}

        {type === 'transform.rare_bridges' && (
          <div>
            <label style={fieldLabelStyle}>Maximum Occurrences</label>
            <input
              type="number"
              min={1}
              step={1}
              value={config.maxOccurrence ?? 10}
              onChange={(e) => handleConfigChange('maxOccurrence', Math.max(1, parseInt(e.target.value, 10) || 1))}
              style={inputStyle}
            />
          </div>
        )}

        {type === 'transform.niche_topics' && (
          <div>
            <label style={fieldLabelStyle}>Maximum Files</label>
            <input
              type="number"
              min={1}
              step={1}
              value={config.maxFiles ?? 2}
              onChange={(e) => handleConfigChange('maxFiles', Math.max(1, parseInt(e.target.value, 10) || 1))}
              style={inputStyle}
            />
          </div>
        )}

        {type === 'transform.spiking_signals' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={fieldLabelStyle}>Window Width Ratio</label>
              <input
                type="number"
                min={0.01}
                max={1}
                step={0.01}
                value={config.windowWidthRatio ?? 0.2}
                onChange={(e) => handleConfigChange('windowWidthRatio', Math.min(1, Math.max(0.01, Number(e.target.value) || 0.01)))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={fieldLabelStyle}>Minimum Concentration</label>
              <input
                type="number"
                min={0.01}
                max={1}
                step={0.01}
                value={config.minConcentration ?? 0.6}
                onChange={(e) => handleConfigChange('minConcentration', Math.min(1, Math.max(0.01, Number(e.target.value) || 0.01)))}
                style={inputStyle}
              />
            </div>
          </div>
        )}

        {type === 'filter.allow_deny_list' && (
          <div>
            <label style={fieldLabelStyle}>Denylist Patterns (comma-separated RegExp or strings)</label>
            <textarea
              rows={4}
              value={config.deniedNames || ''}
              onChange={(e) => handleConfigChange('deniedNames', e.target.value)}
              placeholder="e.g. (?i)^test.*, bad_entity, \d{3}-\d{2}-\d{4}, /secret_\d+/i"
              style={textareaStyle}
            />
            <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-dim)', marginTop: '0.25rem', lineHeight: 1.4 }}>
              Supports regular expression patterns like <code>/(?i)regex/</code> or simple case-insensitive names separated by commas.
            </p>
          </div>
        )}

        {type === 'filter.date_range' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={fieldLabelStyle}>Start Date</label>
              <input
                type="date"
                value={config.startDate || ''}
                onChange={(e) => handleConfigChange('startDate', e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={fieldLabelStyle}>End Date</label>
              <input
                type="date"
                value={config.endDate || ''}
                onChange={(e) => handleConfigChange('endDate', e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>
        )}

        {type === 'transform.llm_annotate' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={fieldLabelStyle}>{t('pipeline.llm.provider')}</label>
              <select value={config.provider || 'mistral'} onChange={(e) => handleConfigChange('provider', e.target.value)} style={inputStyle}>
                <option value="mistral">Mistral</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            {config.provider === 'custom' && (
              <div>
                <label style={fieldLabelStyle}>{t('pipeline.llm.endpoint')}</label>
                <input
                  type="text"
                  value={config.endpoint || 'http://localhost:11434/v1'}
                  onChange={(e) => handleConfigChange('endpoint', e.target.value)}
                  style={inputStyle}
                />
              </div>
            )}
            <div>
              <label style={fieldLabelStyle}>{t('pipeline.llm.model')}</label>
              <input type="text" value={config.model || ''} onChange={(e) => handleConfigChange('model', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={fieldLabelStyle}>{t('pipeline.llm.max_nodes')}</label>
              <input
                type="number"
                min={1}
                max={500}
                value={config.maxNodes ?? 80}
                onChange={(e) => handleConfigChange('maxNodes', Math.max(1, Number(e.target.value) || 1))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={fieldLabelStyle}>{t('pipeline.llm.prompt')}</label>
              <textarea
                rows={6}
                value={config.prompt || ''}
                onChange={(e) => handleConfigChange('prompt', e.target.value)}
                placeholder={t('pipeline.llm.prompt_placeholder')}
                style={textareaStyle}
              />
            </div>
          </div>
        )}

        {type === 'transform.entity_resolver' && (
          <div>
            <label style={fieldLabelStyle}>Similarity Threshold ({config.threshold ?? 0.85})</label>
            <input
              type="range"
              min={0.5}
              max={1.0}
              step={0.01}
              value={config.threshold ?? 0.85}
              onChange={(e) => handleConfigChange('threshold', parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--color-primary)' }}
            />
            <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-dim)', marginTop: '0.25rem', lineHeight: 1.4 }}>
              Higher values merge only extremely similar names. Lower values are more aggressive.
            </p>
          </div>
        )}

        {type === 'output.obsidian_vault' && (
          <div>
            <label style={fieldLabelStyle}>Zip File Name</label>
            <input type="text" value={config.zipName || ''} onChange={(e) => handleConfigChange('zipName', e.target.value)} style={inputStyle} />
          </div>
        )}

        {(type === 'output.json' || type === 'output.graphml' || type === 'output.obsidian_vault' || type === 'output.ai_report' || type === 'output.html_dashboard') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={fieldLabelStyle}>Export Target Destination</label>
              <select value={exportLocationValue} onChange={(e) => handleConfigChange('exportLocation', e.target.value)} style={inputStyle}>
                {!isHtmlDashboard && <option value="downloads">Browser Downloads folder (Default)</option>}
                <option value="session">Current Active Session folder</option>
                <option value="custom">Custom folder on server...</option>
              </select>
            </div>

            {exportLocationValue === 'custom' && (
              <div>
                <label style={fieldLabelStyle}>Export Folder (Server Path)</label>
                <input
                  type="text"
                  value={config.exportFolder || ''}
                  onChange={(e) => handleConfigChange('exportFolder', e.target.value)}
                  placeholder="e.g. uploads/exports"
                  style={inputStyle}
                />
                <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-dim)', marginTop: '0.25rem', lineHeight: 1.4 }}>
                  Custom server directory where the export file will be saved.
                </p>
              </div>
            )}
          </div>
        )}

        {type === 'output.ai_report' && (
          <>
            <div>
              <label style={fieldLabelStyle}>Model Focus</label>
              <select value={config.focusType || 'general'} onChange={(e) => handleConfigChange('focusType', e.target.value)} style={inputStyle}>
                <option value="general">General Analysis</option>
                <option value="actors">Key Actors & Identifiers</option>
                <option value="networks">Linkage & Clusters</option>
                <option value="timeline">Timeline</option>
              </select>
            </div>
            <div>
              <label style={fieldLabelStyle}>Output Language</label>
              <select value={config.language || 'en'} onChange={(e) => handleConfigChange('language', e.target.value)} style={inputStyle}>
                <option value="en">English</option>
                <option value="fr">French</option>
              </select>
            </div>
            <div>
              <label style={fieldLabelStyle}>{t('pipeline.llm.provider')}</label>
              <select value={config.apiProvider || config.provider || 'mistral'} onChange={(e) => handleConfigChange('apiProvider', e.target.value)} style={inputStyle}>
                <option value="mistral">Mistral</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            {(config.apiProvider || config.provider) === 'custom' && (
              <div>
                <label style={fieldLabelStyle}>{t('pipeline.llm.endpoint')}</label>
                <input
                  type="text"
                  value={config.apiEndpoint || config.endpoint || 'http://localhost:11434/v1'}
                  onChange={(e) => handleConfigChange('apiEndpoint', e.target.value)}
                  style={inputStyle}
                />
              </div>
            )}
            <div>
              <label style={fieldLabelStyle}>API Key</label>
              <input
                type="password"
                value={config.apiKey || ''}
                onChange={(e) => handleConfigChange('apiKey', e.target.value)}
                placeholder="Use MISTRAL_API_KEY if empty"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={fieldLabelStyle}>{t('pipeline.llm.model')}</label>
              {(config.apiProvider || config.provider || 'mistral') === 'mistral' ? (
                <select value={config.model || 'mistral-large-latest'} onChange={(e) => handleConfigChange('model', e.target.value)} style={inputStyle}>
                  <option value="mistral-large-latest">Mistral Large</option>
                  <option value="mistral-small-latest">Mistral Small</option>
                  <option value="open-mixtral-8x22b">Open Mixtral 8x22B</option>
                </select>
              ) : (
                <input
                  type="text"
                  value={config.model || 'llama3'}
                  onChange={(e) => handleConfigChange('model', e.target.value)}
                  style={inputStyle}
                />
              )}
            </div>
            <div>
              <label style={fieldLabelStyle}>Top Entities Limit</label>
              <input type="number" min={10} max={100} step={5} value={config.topEntitiesLimit ?? 30} onChange={(e) => handleConfigChange('topEntitiesLimit', Math.max(1, Number(e.target.value) || 1))} style={inputStyle} />
            </div>
            <div>
              <label style={fieldLabelStyle}>Top TF-IDF Entities Limit</label>
              <input type="number" min={10} max={100} step={5} value={config.topTfidfLimit ?? 30} onChange={(e) => handleConfigChange('topTfidfLimit', Math.max(1, Number(e.target.value) || 1))} style={inputStyle} />
            </div>
            <div>
              <label style={fieldLabelStyle}>Bridge Nodes Limit</label>
              <input type="number" min={5} max={30} step={1} value={config.bridgesLimit ?? 10} onChange={(e) => handleConfigChange('bridgesLimit', Math.max(1, Number(e.target.value) || 1))} style={inputStyle} />
            </div>
            <div>
              <label style={fieldLabelStyle}>Selected Weak Signals</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                {[
                  ['includeBridgeSignals', 'Bridge'],
                  ['includeNicheSignals', 'Niche'],
                  ['includeEmergingSignals', 'Emerging'],
                ].map(([key, label]) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text)' }}>
                    <input
                      type="checkbox"
                      checked={config[key] !== false}
                      onChange={(e) => handleConfigChange(key, e.target.checked)}
                      style={{ accentColor: 'var(--color-primary)', width: 14, height: 14 }}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label style={fieldLabelStyle}>Weak Signals Per Category</label>
              <input type="number" min={0} max={50} step={1} value={config.weakSignalsLimit ?? 10} onChange={(e) => handleConfigChange('weakSignalsLimit', Math.max(0, Number(e.target.value) || 0))} style={inputStyle} />
            </div>
            <div>
              <label style={fieldLabelStyle}>Analyst Directives</label>
              <textarea
                rows={4}
                value={config.customInstructions ?? config.directives ?? ''}
                onChange={(e) => handleConfigChange('customInstructions', e.target.value)}
                placeholder="e.g. Focus on connections between person A and B"
                style={textareaStyle}
              />
            </div>
          </>
        )}

        {(type === 'output.json' || type === 'output.graphml' || type === 'output.ai_report' || type === 'output.html_dashboard') && (
          <div>
            <label style={fieldLabelStyle}>Export File Name</label>
            <input type="text" value={config.fileName || ''} onChange={(e) => handleConfigChange('fileName', e.target.value)} style={inputStyle} />
          </div>
        )}

        {type === 'output.kuzudb_write' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
            <input
              type="checkbox"
              id="kuzudb-confirm"
              checked={config.confirmCommit || false}
              onChange={(e) => handleConfigChange('confirmCommit', e.target.checked)}
              style={{ accentColor: 'var(--color-primary)', width: 14, height: 14, cursor: 'pointer' }}
            />
            <label htmlFor="kuzudb-confirm" style={{ fontSize: '0.75rem', color: 'var(--color-text)', cursor: 'pointer' }}>
              Confirm writing to live graph database
            </label>
          </div>
        )}

        {![
          'source.sqlite.query',
          'source.kuzudb.query',
          'source.file.document',
          'source.file.email',
          'source.session',
          'source.file.csv',
          'source.web.scraper',
          'filter.entity_category',
          'filter.top_n_nodes',
          'filter.min_tfidf',
          'filter.min_occurrences',
          'filter.min_connections',
          'filter.edge_weight_threshold',
          'filter.weak_signal_flag',
          'filter.allow_deny_list',
          'filter.date_range',
          'transform.rare_bridges',
          'transform.niche_topics',
          'transform.spiking_signals',
          'transform.llm_annotate',
          'transform.entity_resolver',
          'output.obsidian_vault',
          'output.ai_report',
          'output.json',
          'output.graphml',
          'output.kuzudb_write',
          'output.html_dashboard',
        ].includes(type) && (
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', fontStyle: 'italic', margin: 0 }}>This node has no configurable parameters.</p>
        )}
      </div>

      {divider}

      <div>
        <h4 style={{ ...sectionLabelStyle, margin: 0 }}>Test Node</h4>

        {isVisualizeNode ? (
          <div style={{ padding: '1rem', background: 'rgba(124, 58, 237, 0.08)', border: '1px solid var(--color-primary)', borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text)' }}>
                {testData ? 'Visualization Ready' : 'Prepare Visualization'}
              </span>
            </div>
            {testData && (
              <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-dim)', margin: 0, lineHeight: 1.4 }}>
                The visualization output is ready to be inspected in full-screen.
              </p>
            )}
            <Button
              variant="primary"
              fullWidth
              loading={testing}
              onClick={() => (testData ? setShowVisualizerModal(true) : runTest(true))}
              style={{ minHeight: '34px' }}
            >
              {testData ? 'Open Fullscreen Preview' : 'Generate & Open Preview'}
            </Button>
          </div>
        ) : (
          <Button variant="primary" fullWidth loading={testing} onClick={() => runTest(false)} style={{ marginTop: '0.5rem', minHeight: '36px' }}>
            {testing ? 'Running Dry Run...' : 'Test This Step'}
          </Button>
        )}

        {testError && (
          <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: '#3d1d26', border: '1px solid var(--color-error)', borderRadius: 'var(--radius-sm)', color: 'var(--color-error)', fontSize: '0.75rem' }}>
            {testError}
          </div>
        )}

        {testData && (
          <div style={{ marginTop: '0.75rem', padding: '0.75rem 1rem', background: 'var(--color-surface-raised)', border: '1px solid var(--color-surface-hover)', borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.6875rem', borderBottom: '1px solid var(--color-surface-hover)', paddingBottom: '0.375rem' }}>
              <span style={{ color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Result: {testData.type}</span>
              <span style={{ color: '#10b981', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>SUCCESS</span>
            </div>

            {testData.type === 'file_download' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>File generated and downloaded:</p>
                <div style={{ padding: '0.625rem', background: 'var(--color-surface-input)', border: '1px solid var(--color-surface-raised)', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>File Name:</span>
                    <span style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>{testData.fileName}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>File Type:</span>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>{testData.mimeType}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>File Size:</span>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>{(testData.sizeBytes / 1024).toFixed(2)} KB</span>
                  </div>
                </div>
              </div>
            ) : testData.type === 'tabular' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', overflow: 'hidden' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>Returned {testData.data?.length || 0} rows.</p>
                {testData.data?.slice(0, 3).map((row: any, idx: number) => (
                  <pre key={idx} style={{ padding: '0.5rem', background: 'var(--color-surface-input)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', overflowX: 'auto', color: 'var(--color-text-muted)', margin: 0 }}>
                    {JSON.stringify(row, null, 2)}
                  </pre>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>
                  Returned {testData.nodes?.length || 0} entities, {testData.edges?.length || 0} edges.
                </p>
                <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {testData.nodes?.slice(0, 10).map((n: any) => (
                    <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', padding: '0.25rem 0.5rem', background: 'var(--color-surface-input)', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ color: 'var(--color-text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>{n.label || n.displayName}</span>
                      <span style={{ color: 'var(--color-primary-hover)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', fontSize: '0.625rem' }}>{n.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ marginTop: '1rem' }}>
        <Button variant="danger" fullWidth onClick={handleDeleteNode} style={{ minHeight: '36px' }}>
          Delete Node
        </Button>
      </div>

      {showVisualizerModal && testData && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10, 9, 12, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '2rem' }}>
          <div style={{ width: '90vw', height: '85vh', background: 'var(--color-surface)', border: '1px solid var(--color-surface-hover)', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text)', margin: 0, fontFamily: 'var(--font-heading)' }}>
                  {type === 'visualize.graph' ? 'Interactive Graph Preview' : 'Tabular Dataset Preview'}
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0.125rem 0 0' }}>Node ID: {selectedNode.id}</p>
              </div>
              <button
                onClick={() => setShowVisualizerModal(false)}
                style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-surface-hover)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}
              >
                ✕
              </button>
            </div>

            <div style={{ flex: 1, padding: '1.5rem', minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {type === 'visualize.graph' ? (
                <GraphPreview data={testData} view={GraphCanvas} />
              ) : type === 'visualize.table' && testData.nodes ? (
                <GraphPreview data={testData} view={EntityTableView} />
              ) : type === 'visualize.timeline' ? (
                (() => {
                  const chartData = getTimelineData(testData);
                  if (chartData.length === 0) {
                    return <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', textAlign: 'center', marginTop: '2rem' }}>No date/temporal metadata available in graph occurrences.</p>;
                  }
                  return (
                    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-muted)', margin: 0 }}>Mentions Over Time</h4>
                      <div style={{ flex: 1, minHeight: 0 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-hover)" />
                            <XAxis dataKey="date" stroke="var(--color-text-muted)" fontSize={10} />
                            <YAxis stroke="var(--color-text-muted)" fontSize={10} />
                            <Tooltip
                              contentStyle={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-surface-hover)', borderRadius: 'var(--radius)' }}
                              labelStyle={{ color: 'var(--color-text)', fontWeight: 'bold' }}
                            />
                            <Bar dataKey="Mentions" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  );
                })()
              ) : (
                (() => {
                  const dataRows = testData.data || [];
                  if (dataRows.length === 0) {
                    return <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', textAlign: 'center', marginTop: '2rem' }}>No data records available.</p>;
                  }
                  const headers = Object.keys(dataRows[0]);
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%', minHeight: 0 }}>
                      <div style={{ flex: 1, overflow: 'auto', border: '1px solid var(--color-surface-raised)', borderRadius: 'var(--radius)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', color: 'var(--color-text)' }}>
                          <thead>
                            <tr style={{ background: 'var(--color-surface-raised)', textAlign: 'left', borderBottom: '1px solid var(--color-surface-hover)' }}>
                              {headers.map((h) => (
                                <th key={h} style={{ padding: '0.625rem 0.875rem', fontWeight: 600, color: 'var(--color-text-muted)', borderRight: '1px solid var(--color-surface-hover)', whiteSpace: 'nowrap' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {dataRows.map((row: any, i: number) => (
                              <tr key={i} style={{ borderBottom: '1px solid var(--color-surface-hover)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                                {headers.map((h) => (
                                  <td key={h} style={{ padding: '0.625rem 0.875rem', borderRight: '1px solid var(--color-surface-hover)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '300px' }}>
                                    {typeof row[h] === 'object' ? JSON.stringify(row[h]) : String(row[h])}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
