'use client';

import Badge from '@/components/ui/Badge';
import { ENTITY_COLORS, EntityType } from '@/types/entities';
import { formatBytes } from './SnippetCard';

interface Props {
  data: {
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    uploadedAt: string;
    processedAt?: string;
    entities?: Array<{ id: string; displayName: string; type: EntityType; count: number }>;
  };
  fileId: string;
  onSelectNode: (id: string) => void;
  onDelete: () => void;
}

export default function FileNodePanel({ data, fileId, onSelectNode, onDelete }: Props) {
  return (
    <>
      <section style={{ marginBottom: '2.5rem' }}>
        <SectionLabel>File Information</SectionLabel>
        <div style={{ background: 'rgba(16,0,43,0.6)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <InfoRow label="Name">{data.originalName}</InfoRow>
          <InfoRow label="Type"><span style={{ fontFamily: 'var(--font-mono)' }}>{data.mimeType}</span></InfoRow>
          <InfoRow label="Size"><span style={{ fontFamily: 'var(--font-mono)' }}>{formatBytes(data.sizeBytes)}</span></InfoRow>
          <InfoRow label="Uploaded">{new Date(data.uploadedAt).toLocaleString()}</InfoRow>
          {data.processedAt && <InfoRow label="Processed">{new Date(data.processedAt).toLocaleString()}</InfoRow>}
        </div>
        <div style={{ marginTop: '1rem' }}>
          <a
            href={`/api/files/${fileId}/download`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '0.75rem', background: 'var(--color-primary)', color: 'var(--color-on-primary)', borderRadius: 'var(--radius)', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none', transition: 'all var(--transition-fast)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-primary-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-primary)'; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '0.5rem' }}>
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Open File
          </a>
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <SectionLabel>Extracted Entities ({data.entities?.length || 0})</SectionLabel>
        {data.entities?.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {data.entities.map((ent) => (
              <div
                key={ent.id}
                onClick={() => onSelectNode(ent.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.875rem', background: 'rgba(16,0,43,0.4)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', cursor: 'pointer', transition: 'all var(--transition-fast)' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = ENTITY_COLORS[ent.type] || 'var(--color-secondary)'; e.currentTarget.style.background = 'var(--color-surface-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.background = 'rgba(16,0,43,0.4)'; }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: ENTITY_COLORS[ent.type] || 'var(--color-text-muted)', flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: '0.8rem', color: 'var(--color-text)', fontWeight: 500 }}>{ent.displayName}</span>
                <Badge entityType={ent.type} size="sm">{ent.type}</Badge>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>×{ent.count}</span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>No entities extracted from this file.</p>
        )}
      </section>

      <section style={{ marginTop: '3.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
        <DangerButton onClick={onDelete}>Delete File from Graph</DangerButton>
      </section>
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '1rem', fontFamily: 'var(--font-display)' }}>
      {children}
    </p>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
      <span style={{ color: 'var(--color-text-muted)' }}>{label}:</span>
      <span style={{ color: 'var(--color-text)', fontWeight: 500, wordBreak: 'break-all', textAlign: 'right', marginLeft: '1rem' }}>{children}</span>
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
