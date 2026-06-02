'use client';

import { useState } from 'react';
import { useSWRConfig } from 'swr';
import { useUploadStore } from '@/store/uploadStore';
import Button from '@/components/ui/Button';
import exportSessionAsJson from '@/lib/sessionExport';
import { ActiveTab, LayoutType } from './types';

interface FilterOptions {
  senders: string[];
  recipients: string[];
}

interface FiltersPanelProps {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  senderFilter: string;
  onSenderChange: (v: string) => void;
  recipientFilter: string;
  onRecipientChange: (v: string) => void;
  filterOptions: FilterOptions;
  focusedThreadRootId: string | null;
  onResetFocus: () => void;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  layoutType: LayoutType;
  onLayoutChange: (layout: LayoutType) => void;
}

const inputStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  fontSize: '0.8125rem',
  background: '#120108',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--color-text)',
  outline: 'none',
  transition: 'all 0.15s ease-in-out',
  width: '100%',
};

export default function FiltersPanel({
  searchQuery,
  onSearchChange,
  senderFilter,
  onSenderChange,
  recipientFilter,
  onRecipientChange,
  filterOptions,
  focusedThreadRootId,
  onResetFocus,
  activeTab,
  onTabChange,
  layoutType,
  onLayoutChange,
}: FiltersPanelProps) {
  const { sessionId, setSessionId, addFiles } = useUploadStore();
  const { mutate } = useSWRConfig();
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

  const handleImportClick = () => {
    setImportError(null);
    document.getElementById('import-email-file-input')?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportError(null);

    try {
      const text = await file.text();
      let parsedData;
      try {
        parsedData = JSON.parse(text);
      } catch (err) {
        throw new Error('Invalid JSON format. Please upload a valid JSON file.');
      }

      if (!parsedData.nodes || !parsedData.edges) {
        throw new Error('Invalid graph structure. The JSON must contain "nodes" and "edges" arrays.');
      }

      const response = await fetch('/api/session/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
        throw new Error(errJson.error || 'Failed to import JSON graph.');
      }

      const resData = await response.json();

      if (!sessionId && resData.sessionId) {
        setSessionId(resData.sessionId);
      }

      if (Array.isArray(resData.files)) {
        addFiles(resData.files);
      }

      // Mutate SWR keys
      mutate((key) => typeof key === 'string' && (key.includes('/api/emails') || key.includes('/api/graph/')));

    } catch (err: any) {
      console.error('Import failed', err);
      setImportError(err.message || 'An unknown error occurred during import.');
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };
  return (
    <div
      style={{
        width: '280px',
        borderRight: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        padding: '1.25rem',
        overflowY: 'auto',
        flexShrink: 0,
      }}
    >
      {/* Filters section */}
      <div>
        <h3 style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.875rem' }}>
          Explorer Filters
        </h3>

        {/* Search */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Search queries</label>
          <input
            type="text"
            placeholder="Subject, body, address..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = 'var(--color-primary)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
          />
        </div>

        {/* Sender filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>From Sender</label>
          <select value={senderFilter} onChange={(e) => onSenderChange(e.target.value)} style={inputStyle}>
            <option value="all">All Senders</option>
            {filterOptions.senders.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Recipient filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>To/Cc Recipient</label>
          <select value={recipientFilter} onChange={(e) => onRecipientChange(e.target.value)} style={inputStyle}>
            <option value="all">All Recipients</option>
            {filterOptions.recipients.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* Thread focus indicator */}
        {focusedThreadRootId && (
          <div
            style={{
              marginTop: '0.5rem',
              padding: '0.75rem',
              background: 'rgba(76, 158, 240, 0.08)',
              border: '1px solid rgba(76, 158, 240, 0.25)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.375rem',
            }}
          >
            <p style={{ fontSize: '0.75rem', fontWeight: 500, color: '#4C9EF0', margin: 0 }}>
              Focused Conversation Active
            </p>
            <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', margin: 0 }}>
              Isolating conversation path replies.
            </p>
            <button
              onClick={onResetFocus}
              style={{ alignSelf: 'flex-start', marginTop: '0.25rem', background: 'transparent', border: 'none', color: 'var(--color-text)', fontSize: '0.75rem', textDecoration: 'underline', padding: 0, cursor: 'pointer' }}
            >
              Reset Focus
            </button>
          </div>
        )}
      </div>

      {/* Visualization options */}
      <div>
        <h3 style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
          Visualization Options
        </h3>

        {/* View mode tabs */}
        <div style={{ display: 'flex', background: '#120108', padding: '3px', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)', marginBottom: '1rem' }}>
          {(['graph', 'list'] as ActiveTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              style={{
                flex: 1,
                padding: '0.375rem 0',
                fontSize: '0.8125rem',
                background: activeTab === tab ? 'var(--color-primary)' : 'transparent',
                color: activeTab === tab ? 'var(--color-on-primary)' : 'var(--color-text)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontWeight: 500,
                transition: 'background 0.15s ease-in-out',
              }}
            >
              {tab === 'graph' ? 'DAG Graph' : 'Table view'}
            </button>
          ))}
        </div>

        {/* Layout selector (graph only) */}
        {activeTab === 'graph' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Graph Layout</label>
            <select
              value={layoutType}
              onChange={(e) => onLayoutChange(e.target.value as LayoutType)}
              style={inputStyle}
            >
              <option value="breadthfirst">Hierarchy Tree (DAG)</option>
              <option value="cose-bilkent">Force-directed</option>
            </select>
          </div>
        )}
      </div>

      {/* Session actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem', marginTop: 'auto' }}>
        <h3 style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
          Session Actions
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: '0.25rem' }}>
          <Button id="save-session-export" variant="secondary" size="xs" onClick={handleSaveExport} disabled={!sessionId} loading={isSaving}>
            Save JSON
          </Button>

          <Button id="import-session-json" variant="secondary" size="xs" onClick={handleImportClick} loading={isImporting}>
            Import JSON
          </Button>
        </div>

        <input
          id="import-email-file-input"
          type="file"
          accept=".json"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        {importError && (
          <span style={{ fontSize: '0.72rem', color: 'var(--error)', marginTop: 4, display: 'block', textAlign: 'center' }}>
            {importError}
          </span>
        )}
      </div>
    </div>
  );
}
