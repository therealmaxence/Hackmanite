import React, { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import { useUploadStore } from '@/store/uploadStore';

interface NodeConfigDrawerProps {
  selectedNode: any;
  selectedPipelineId: string | null;
  handleConfigChange: (key: string, val: any) => void;
  handleLabelChange: (val: string) => void;
  handleDeleteNode: () => void;
}

export default function NodeConfigDrawer({
  selectedNode,
  selectedPipelineId,
  handleConfigChange,
  handleLabelChange,
  handleDeleteNode,
}: NodeConfigDrawerProps) {
  const [testing, setTesting] = useState(false);
  const [testData, setTestData] = useState<any>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const [sessionFiles, setSessionFiles] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const { sessionId, setSessionId, addFiles } = useUploadStore();

  const fetchSessionFiles = async () => {
    setLoadingFiles(true);
    try {
      const res = await fetch('/api/session');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setSessions(data);
          const allFiles = data.flatMap((session: any) =>
            (session.files || []).map((f: any) => ({
              ...f,
              sessionId: session.id,
            }))
          );
          setSessionFiles(allFiles);
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
      form.append('files', targetFiles[0]);
      if (sessionId) {
        form.append('sessionId', sessionId);
      }

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: form,
      });

      if (!res.ok) {
        throw new Error((await res.json()).error || 'Upload failed');
      }

      const data = await res.json();
      if (!sessionId && data.sessionId) {
        setSessionId(data.sessionId);
      }

      const uploadedJob = data.jobs?.[0];
      if (uploadedJob) {
        addFiles([
          {
            fileId: uploadedJob.fileId,
            jobId: uploadedJob.jobId,
            originalName: uploadedJob.originalName,
            status: 'PENDING',
            entityCount: 0,
            error: null,
            sizeBytes: targetFiles[0].size,
            mimeType: targetFiles[0].type || 'application/octet-stream',
            addedAt: Date.now(),
          }
        ]);

        await fetchSessionFiles();
        handleConfigChange('filePath', uploadedJob.originalName);
        alert('File uploaded and selected successfully!');
      }
    } catch (err: any) {
      console.error(err);
      alert('Failed to upload file: ' + err.message);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const testNode = async () => {
    if (!selectedPipelineId) {
      alert('Please save the pipeline before testing.');
      return;
    }

    setTesting(true);
    setTestData(null);
    setTestError(null);

    try {
      const res = await fetch(`/api/pipelines/${selectedPipelineId}/dry-run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId: selectedNode.id }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setTestError(err.error || 'Execution failed');
        return;
      }

      setTestData(await res.json());
    } catch {
      setTestError('Connection failed');
    } finally {
      setTesting(false);
    }
  };

  const type = selectedNode.data.type;
  const config = selectedNode.data.config || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <label style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Node ID
        </label>
        <input
          type="text"
          disabled
          value={selectedNode.id}
          style={{
            width: '100%',
            marginTop: '0.375rem',
            padding: '0.5rem 0.75rem',
            fontSize: '0.8125rem',
            background: 'var(--color-surface-input)',
            border: '1px solid var(--color-surface-raised)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-text-muted)',
            cursor: 'default',
            outline: 'none',
          }}
        />
      </div>

      <div>
        <label style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Label
        </label>
        <input
          type="text"
          value={selectedNode.data.label}
          onChange={(e) => handleLabelChange(e.target.value)}
          style={{
            width: '100%',
            marginTop: '0.375rem',
            padding: '0.5rem 0.75rem',
            fontSize: '0.8125rem',
            background: 'var(--color-surface-input)',
            border: '1px solid var(--color-surface-raised)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-text)',
            outline: 'none',
          }}
        />
      </div>

      <div style={{ width: '100%', height: '1px', background: 'var(--color-surface-raised)', margin: '0.5rem 0' }} />

      <h4 style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
        Parameters
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {type === 'source.sqlite.query' && (
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>SQL Query</label>
            <textarea
              rows={6}
              value={config.query || ''}
              onChange={(e) => handleConfigChange('query', e.target.value)}
              style={{
                width: '100%',
                marginTop: '0.375rem',
                padding: '0.5rem 0.75rem',
                fontSize: '0.8125rem',
                fontFamily: 'var(--font-mono)',
                background: 'var(--color-surface-input)',
                border: '1px solid var(--color-surface-raised)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-text)',
                outline: 'none',
              }}
            />
          </div>
        )}

        {type === 'source.file.document' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Select File from Session</label>
              {loadingFiles ? (
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', margin: '0.25rem 0' }}>Loading files...</p>
              ) : (
                <select
                  value={config.filePath || ''}
                  onChange={(e) => handleConfigChange('filePath', e.target.value)}
                  style={{
                    width: '100%',
                    marginTop: '0.375rem',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.8125rem',
                    background: 'var(--color-surface-input)',
                    border: '1px solid var(--color-surface-raised)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-text)',
                    outline: 'none',
                  }}
                >
                  <option value="">-- Choose uploaded file --</option>
                  {sessionFiles.map((file) => (
                    <option key={file.fileId} value={file.originalName}>
                      {file.originalName} ({file.mimeType.split('/').pop()})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Or Upload a New File</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="file"
                  id="drawer-file-upload"
                  style={{ display: 'none' }}
                  onChange={handleUpload}
                  disabled={isUploading}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => document.getElementById('drawer-file-upload')?.click()}
                  loading={isUploading}
                  style={{ flex: 1, minHeight: '34px' }}
                >
                  {isUploading ? 'Uploading...' : 'Choose File'}
                </Button>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Active Path / Name</label>
              <input
                type="text"
                value={config.filePath || ''}
                onChange={(e) => handleConfigChange('filePath', e.target.value)}
                placeholder="Or input custom path manually..."
                style={{
                  width: '100%',
                  marginTop: '0.375rem',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.8125rem',
                  background: 'var(--color-surface-input)',
                  border: '1px solid var(--color-surface-raised)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-text)',
                  outline: 'none',
                }}
              />
            </div>
          </div>
        )}

        {type === 'source.file.email' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Select Email File from Session</label>
              {loadingFiles ? (
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', margin: '0.25rem 0' }}>Loading files...</p>
              ) : (
                <select
                  value={config.filePath || ''}
                  onChange={(e) => handleConfigChange('filePath', e.target.value)}
                  style={{
                    width: '100%',
                    marginTop: '0.375rem',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.8125rem',
                    background: 'var(--color-surface-input)',
                    border: '1px solid var(--color-surface-raised)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-text)',
                    outline: 'none',
                  }}
                >
                  <option value="">-- Choose uploaded email (.eml/.pst) --</option>
                  {sessionFiles
                    .filter((f) => f.originalName.endsWith('.eml') || f.originalName.endsWith('.pst') || f.mimeType.includes('email') || f.mimeType.includes('outlook'))
                    .map((file) => (
                      <option key={file.fileId} value={file.originalName}>
                        {file.originalName}
                      </option>
                    ))}
                </select>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Or Upload a New Email File</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="file"
                  id="drawer-email-upload"
                  accept=".eml,.pst"
                  style={{ display: 'none' }}
                  onChange={handleUpload}
                  disabled={isUploading}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => document.getElementById('drawer-email-upload')?.click()}
                  loading={isUploading}
                  style={{ flex: 1, minHeight: '34px' }}
                >
                  {isUploading ? 'Uploading...' : 'Choose Email File'}
                </Button>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Active Path / Name</label>
              <input
                type="text"
                value={config.filePath || ''}
                onChange={(e) => handleConfigChange('filePath', e.target.value)}
                placeholder="Or input custom path manually..."
                style={{
                  width: '100%',
                  marginTop: '0.375rem',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.8125rem',
                  background: 'var(--color-surface-input)',
                  border: '1px solid var(--color-surface-raised)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-text)',
                  outline: 'none',
                }}
              />
            </div>
          </div>
        )}

        {type === 'source.session' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Select Active Session</label>
              {loadingFiles ? (
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', margin: '0.25rem 0' }}>Loading sessions...</p>
              ) : (
                <select
                  value={config.sessionId || ''}
                  onChange={(e) => handleConfigChange('sessionId', e.target.value)}
                  style={{
                    width: '100%',
                    marginTop: '0.375rem',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.8125rem',
                    background: 'var(--color-surface-input)',
                    border: '1px solid var(--color-surface-raised)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-text)',
                    outline: 'none',
                  }}
                >
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
              <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Active Session ID</label>
              <input
                type="text"
                value={config.sessionId || ''}
                onChange={(e) => handleConfigChange('sessionId', e.target.value)}
                placeholder="Or input custom session ID manually..."
                style={{
                  width: '100%',
                  marginTop: '0.375rem',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.8125rem',
                  background: 'var(--color-surface-input)',
                  border: '1px solid var(--color-surface-raised)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-text)',
                  outline: 'none',
                }}
              />
            </div>
          </div>
        )}

        {type === 'filter.entity_category' && (
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Allowed Categories (comma-separated)</label>
            <input
              type="text"
              value={config.categories || ''}
              onChange={(e) => handleConfigChange('categories', e.target.value)}
              style={{
                width: '100%',
                marginTop: '0.375rem',
                padding: '0.5rem 0.75rem',
                fontSize: '0.8125rem',
                background: 'var(--color-surface-input)',
                border: '1px solid var(--color-surface-raised)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-text)',
                outline: 'none',
              }}
            />
          </div>
        )}

        {type === 'output.obsidian_vault' && (
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Zip File Name</label>
            <input
              type="text"
              value={config.zipName || ''}
              onChange={(e) => handleConfigChange('zipName', e.target.value)}
              style={{
                width: '100%',
                marginTop: '0.375rem',
                padding: '0.5rem 0.75rem',
                fontSize: '0.8125rem',
                background: 'var(--color-surface-input)',
                border: '1px solid var(--color-surface-raised)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-text)',
                outline: 'none',
              }}
            />
          </div>
        )}

        {type === 'output.ai_report' && (
          <>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Model Focus</label>
              <select
                value={config.focusType || 'executive_summary'}
                onChange={(e) => handleConfigChange('focusType', e.target.value)}
                style={{
                  width: '100%',
                  marginTop: '0.375rem',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.8125rem',
                  background: 'var(--color-surface-input)',
                  border: '1px solid var(--color-surface-raised)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-text)',
                  outline: 'none',
                }}
              >
                <option value="executive_summary">Executive Summary</option>
                <option value="threat_actor">Threat Actor Focus</option>
                <option value="network_clusters">Network Clusters</option>
                <option value="temporal_timeline">Temporal Timeline</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Analyst Directives</label>
              <textarea
                rows={3}
                value={config.directives || ''}
                onChange={(e) => handleConfigChange('directives', e.target.value)}
                placeholder="e.g. Focus on connections between person A and B"
                style={{
                  width: '100%',
                  marginTop: '0.375rem',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.8125rem',
                  background: 'var(--color-surface-input)',
                  border: '1px solid var(--color-surface-raised)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-text)',
                  outline: 'none',
                }}
              />
            </div>
          </>
        )}

        {type === 'output.json' && (
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Export File Name</label>
            <input
              type="text"
              value={config.fileName || ''}
              onChange={(e) => handleConfigChange('fileName', e.target.value)}
              style={{
                width: '100%',
                marginTop: '0.375rem',
                padding: '0.5rem 0.75rem',
                fontSize: '0.8125rem',
                background: 'var(--color-surface-input)',
                border: '1px solid var(--color-surface-raised)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-text)',
                outline: 'none',
              }}
            />
          </div>
        )}

        {type === 'output.kuzudb_write' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
            <input
              type="checkbox"
              id="kuzudb-confirm"
              checked={config.confirmCommit || false}
              onChange={(e) => handleConfigChange('confirmCommit', e.target.checked)}
              style={{
                accentColor: 'var(--color-primary)',
                width: 14,
                height: 14,
                cursor: 'pointer',
              }}
            />
            <label htmlFor="kuzudb-confirm" style={{ fontSize: '0.75rem', color: 'var(--color-text)', cursor: 'pointer' }}>
              Confirm writing to live graph database
            </label>
          </div>
        )}

        {!['source.sqlite.query', 'source.file.document', 'source.file.email', 'source.session', 'filter.entity_category', 'output.obsidian_vault', 'output.ai_report', 'output.json', 'output.kuzudb_write'].includes(type) && (
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', fontStyle: 'italic', margin: 0 }}>This node has no configurable parameters.</p>
        )}
      </div>

      <div style={{ width: '100%', height: '1px', background: 'var(--color-surface-raised)', margin: '0.5rem 0' }} />

      <div>
        <h4 style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
          Test Node
        </h4>
        <Button
          variant="primary"
          fullWidth
          loading={testing}
          onClick={testNode}
          style={{ marginTop: '0.5rem', minHeight: '36px' }}
        >
          {testing ? 'Running Dry Run...' : 'Test This Step'}
        </Button>

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

            {testData.type === 'tabular' ? (
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
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>Returned {testData.nodes?.length || 0} entities, {testData.edges?.length || 0} edges.</p>
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
        <Button
          variant="danger"
          fullWidth
          onClick={handleDeleteNode}
          style={{ minHeight: '36px' }}
        >
          Delete Node
        </Button>
      </div>
    </div>
  );
}
