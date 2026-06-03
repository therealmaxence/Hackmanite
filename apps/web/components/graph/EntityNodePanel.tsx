'use client';

import { useState } from 'react';
import Badge from '@/components/ui/Badge';
import { ENTITY_COLORS, EntityType } from '@/types/entities';
import SnippetCard from './SnippetCard';

interface FileEntry {
  fileId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  count: number;
  snippets: Array<{
    text: string;
    offset: number;
    relatedEntityId: string;
    relatedEntityName: string;
    relatedEntityType: EntityType;
    weight: number;
  }>;
}

interface CoEntity {
  id: string;
  displayName: string;
  type: EntityType;
  weight: number;
}

interface Props {
  data: {
    id: string;
    canonical: string;
    displayName: string;
    type: EntityType;
    metadata?: Record<string, unknown>;
    files?: FileEntry[];
    coOccurringEntities?: CoEntity[];
  };
  totalOccurrences: number;
  sessionId: string;
  onSelectNode: (id: string) => void;
  onDelete: () => void;
}

export default function EntityNodePanel({ data, totalOccurrences, sessionId, onSelectNode, onDelete }: Props) {
  const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({});

  return (
    <>
      <section style={{ marginBottom: '2.5rem' }}>
        <SectionLabel>Entity Overview</SectionLabel>
        <div style={{ background: 'rgba(16,0,43,0.6)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <InfoRow label="Canonical Name"><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{data.canonical}</span></InfoRow>
          <InfoRow label="Entity Type"><Badge entityType={data.type} size="sm">{data.type}</Badge></InfoRow>
          <InfoRow label="Total Occurrences"><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{totalOccurrences}</span></InfoRow>
          <InfoRow label="Unique Files"><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{data.files?.length || 0}</span></InfoRow>
        </div>

        {data.type === 'EMAIL' && (
          <div style={{ marginTop: '1rem' }}>
            <a
              href={`/emails?search=${encodeURIComponent(data.canonical)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '0.75rem', background: 'rgba(245,158,11,0.15)', border: '1px solid #f59e0b', color: '#f59e0b', borderRadius: 'var(--radius)', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none', transition: 'all var(--transition-fast)', textAlign: 'center' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#f59e0b'; e.currentTarget.style.color = '#10002b'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(245,158,11,0.15)'; e.currentTarget.style.color = '#f59e0b'; }}
            >
              Open in Email Viewer
            </a>
          </div>
        )}

        {data.metadata && Object.keys(data.metadata).length > 0 && (
          <div style={{ marginTop: '1.25rem' }}>
            <SectionLabel>Properties</SectionLabel>
            <div style={{ background: 'rgba(16,0,43,0.6)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
              {Object.entries(data.metadata).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.65rem', textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}:</span>
                  <span style={{ color: 'var(--color-text)', fontSize: '0.75rem', fontWeight: 500, wordBreak: 'break-all', fontFamily: 'var(--font-mono)' }}>{String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <SectionLabel>Appears In & Snippets ({data.files?.length || 0} files)</SectionLabel>
        {(data.files || []).map((f) => (
          <FileSnippetBlock
            key={f.fileId}
            file={f}
            entityId={data.id}
            entityDisplayName={data.displayName}
            entityType={data.type}
            expanded={!!expandedFiles[f.fileId]}
            onToggle={() => setExpandedFiles((prev) => ({ ...prev, [f.fileId]: !prev[f.fileId] }))}
            onSelectNode={onSelectNode}
          />
        ))}
      </section>

      {(data.coOccurringEntities?.length ?? 0) > 0 && (
        <section style={{ marginBottom: '2rem' }}>
          <SectionLabel>Connected Entities (Top {Math.min(data.coOccurringEntities!.length, 15)})</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {data.coOccurringEntities!.slice(0, 15).map((co) => (
              <CoEntityCard key={co.id} co={co} onSelect={() => onSelectNode(co.id)} />
            ))}
          </div>
        </section>
      )}

      <section style={{ marginTop: '3.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
        <DangerButton onClick={onDelete}>Delete Node from Graph</DangerButton>
      </section>
    </>
  );
}

function FileSnippetBlock({ file, entityId, entityDisplayName, entityType, expanded, onToggle, onSelectNode }: {
  file: FileEntry;
  entityId: string;
  entityDisplayName: string;
  entityType: EntityType;
  expanded: boolean;
  onToggle: () => void;
  onSelectNode: (id: string) => void;
}) {
  const visibleSnippets = expanded ? file.snippets : file.snippets?.slice(0, 5);

  return (
    <div style={{ background: 'rgba(16,0,43,0.6)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '1.25rem', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <a
          href={`/api/files/${file.fileId}/download`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text)', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'transparent', transition: 'all var(--transition-fast)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-primary)'; e.currentTarget.style.textDecorationColor = 'var(--color-primary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text)'; e.currentTarget.style.textDecorationColor = 'transparent'; }}
        >
          {file.fileName}
        </a>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>×{file.count}</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem', fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '1rem', fontFamily: 'var(--font-mono)', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
        <span>{file.mimeType}</span>
        <span style={{ color: 'var(--color-border)' }}>|</span>
        <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {visibleSnippets?.map((snippet, i) => (
          <SnippetCard
            key={`${file.fileId}-${i}`}
            snippet={snippet}
            index={i}
            entityId={entityId}
            entityDisplayName={entityDisplayName}
            entityType={entityType}
            onSelectRelated={onSelectNode}
          />
        ))}
        {file.snippets?.length > 5 && (
          <button
            onClick={onToggle}
            style={{ background: 'rgba(123,47,190,0.08)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, textAlign: 'center', padding: '8px 16px', marginTop: '0.25rem', transition: 'all var(--transition-fast)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-primary)'; e.currentTarget.style.color = 'var(--color-on-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(123,47,190,0.08)'; e.currentTarget.style.color = 'var(--color-primary)'; }}
          >
            {expanded ? 'Show fewer snippets' : `Show all ${file.snippets.length} snippets`}
          </button>
        )}
      </div>
    </div>
  );
}

function CoEntityCard({ co, onSelect }: { co: CoEntity; onSelect: () => void }) {
  return (
    <div
      onClick={onSelect}
      style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 0.875rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', background: 'rgba(16,0,43,0.4)', cursor: 'pointer', transition: 'all var(--transition-fast)' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-hover)'; e.currentTarget.style.borderColor = ENTITY_COLORS[co.type] || 'var(--color-secondary)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(16,0,43,0.4)'; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
    >
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: ENTITY_COLORS[co.type] || 'var(--color-text-muted)', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text)', fontWeight: 600 }}>{co.displayName}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>w={co.weight.toFixed(2)}</span>
        </div>
        <div style={{ height: 4, background: 'var(--color-border)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${co.weight * 100}%`, background: ENTITY_COLORS[co.type] || 'var(--color-primary)', borderRadius: 2 }} />
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '1rem', fontFamily: 'var(--font-display)' }}>{children}</p>;
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
      <span style={{ color: 'var(--color-text-muted)' }}>{label}:</span>
      <span style={{ color: 'var(--color-text)', fontWeight: 500, textAlign: 'right', marginLeft: '1rem' }}>{children}</span>
    </div>
  );
}

function DangerButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{ width: '100%', padding: '0.875rem', background: 'transparent', border: '1px solid var(--color-error)', borderRadius: 'var(--radius)', color: 'var(--color-error)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all var(--transition-fast)' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(238,50,84,0.12)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}
