'use client';

interface SearchResultFile {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  processedAt: string | null;
  snippets: string[];
}

function HighlightText({ text, terms }: { text: string; terms: string[] }) {
  if (!terms || terms.length === 0) return <>{text}</>;
  const escaped = terms
    .map((t) => t.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'))
    .filter(Boolean);
  if (escaped.length === 0) return <>{text}</>;

  const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) => {
        const isMatch = terms.some((term) => term.toLowerCase() === part.toLowerCase());
        return isMatch ? (
          <mark
            key={i}
            style={{
              background: 'rgba(245, 158, 11, 0.25)',
              color: '#f59e0b',
              borderRadius: '2px',
              padding: '0 2px',
              fontWeight: 600,
            }}
          >
            {part}
          </mark>
        ) : (
          part
        );
      })}
    </>
  );
}

interface ResultsViewProps {
  files: SearchResultFile[];
  searchLabels: string[];
  t: (key: string) => string;
}

export default function CooccurrenceResultsView({ files, searchLabels, t }: ResultsViewProps) {
  if (files.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
        {t('graph.cooccurrence.no_results')}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {files.map((file) => (
        <div
          key={file.id}
          style={{
            background: 'var(--color-surface-raised)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius)',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <a
              href={`/api/files/${file.id}/download`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '0.9rem',
                fontWeight: 600,
                color: 'var(--color-text)',
                textDecoration: 'underline',
                textDecorationColor: 'transparent',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--color-primary)';
                e.currentTarget.style.textDecorationColor = 'var(--color-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--color-text)';
                e.currentTarget.style.textDecorationColor = 'transparent';
              }}
            >
              {file.originalName}
            </a>
            <span
              style={{
                fontSize: '0.72rem',
                color: 'var(--color-text-muted)',
                background: 'rgba(255,255,255,0.04)',
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              {file.mimeType}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {file.snippets.map((snippet, idx) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 14px',
                  fontSize: '0.82rem',
                  lineHeight: '1.5',
                  color: 'var(--color-text-dim)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                <HighlightText text={snippet} terms={searchLabels} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
