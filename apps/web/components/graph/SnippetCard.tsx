'use client';

import { ENTITY_COLORS, EntityType } from '@/types/entities';

function formatBytes(bytes: number) {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function highlightMultiple(text: string, highlights: Array<{ term: string; color: string }>) {
  const valid = highlights.filter((h) => h.term?.trim());
  if (!valid.length) return text;
  valid.sort((a, b) => b.term.length - a.term.length);
  const escaped = valid.map((h) => h.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  return text.split(new RegExp(`(${escaped})`, 'ig')).map((part, i) => {
    const match = valid.find((h) => h.term.toLowerCase() === part.toLowerCase());
    return match ? (
      <span key={i} style={{ color: match.color, fontWeight: 700 }}>{part}</span>
    ) : (
      <span key={i}>{part}</span>
    );
  });
}

interface SnippetCardProps {
  snippet: {
    text: string;
    offset: number;
    relatedEntityId: string;
    relatedEntityName: string;
    relatedEntityType: EntityType;
    weight: number;
  };
  index: number;
  entityDisplayName: string;
  entityType: EntityType;
  entityId: string;
  onSelectRelated: (id: string) => void;
}

export default function SnippetCard({ snippet, index, entityDisplayName, entityType, entityId, onSelectRelated }: SnippetCardProps) {
  const isCooccurrence = snippet.relatedEntityId !== entityId;
  const highlights = [{ term: entityDisplayName, color: ENTITY_COLORS[entityType] || 'var(--color-primary)' }];
  if (isCooccurrence) {
    highlights.push({ term: snippet.relatedEntityName, color: ENTITY_COLORS[snippet.relatedEntityType] || 'var(--color-text)' });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.7rem' }}>
        <span style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>Excerpt #{index + 1} (offset {snippet.offset})</span>
        {isCooccurrence && (
          <span style={{ color: 'var(--color-text-muted)' }}>
            Co-occurs with:{' '}
            <strong
              onClick={(e) => { e.stopPropagation(); onSelectRelated(snippet.relatedEntityId); }}
              style={{ color: 'var(--color-text)', cursor: 'pointer', textDecoration: 'underline', transition: 'all var(--transition-fast)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = ENTITY_COLORS[snippet.relatedEntityType] || 'var(--color-primary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text)'; }}
            >
              {snippet.relatedEntityName}
            </strong>
          </span>
        )}
        <span style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>w={snippet.weight.toFixed(2)}</span>
      </div>
      <p style={{ fontSize: '0.775rem', color: 'var(--color-text-muted)', lineHeight: 1.6, borderLeft: `3px solid ${ENTITY_COLORS[entityType] || 'var(--color-secondary)'}`, paddingLeft: '0.75rem', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)', letterSpacing: '-0.015em', margin: 0 }}>
        {highlightMultiple(snippet.text, highlights)}
      </p>
    </div>
  );
}

export { formatBytes };
