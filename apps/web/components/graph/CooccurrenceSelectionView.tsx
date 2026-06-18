'use client';

interface SelectionViewProps {
  nodes: Array<{ id: string; label: string; type: string }>;
  onRemove: (id: string) => void;
  onClear: () => void;
  t: (key: string) => string;
}

export default function CooccurrenceSelectionView({ nodes, onRemove, onClear, t }: SelectionViewProps) {
  if (nodes.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
        {t('graph.cooccurrence.need_more_nodes')}
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
          {t('graph.cooccurrence.selected_nodes')}: {nodes.length}
        </span>
        <button
          onClick={onClear}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-primary)',
            fontSize: '0.72rem',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          {t('graph.hidden.restore_all')}
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          background: '#120108',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius)',
          padding: 12,
          maxHeight: 280,
          overflowY: 'auto',
        }}
        className="custom-scrollbar"
      >
        {nodes.map((node) => (
          <div
            key={node.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 8px',
              borderRadius: '4px',
              background: 'rgba(255, 255, 255, 0.03)',
            }}
          >
            <span style={{ fontSize: '0.82rem', color: 'var(--color-text)', fontWeight: 500 }}>
              {node.label}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  fontSize: '0.7rem',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: 'var(--color-text-muted)',
                  padding: '2px 6px',
                  borderRadius: '10px',
                }}
              >
                {node.type}
              </span>
              <button
                onClick={() => onRemove(node.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  lineHeight: 1,
                  padding: '2px 4px',
                  borderRadius: '4px',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-error)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          background: 'rgba(245, 158, 11, 0.05)',
          border: '1px solid rgba(245, 158, 11, 0.1)',
          borderRadius: 'var(--radius-sm)',
          padding: '10px 12px',
          fontSize: '0.75rem',
          color: '#f59e0b',
          lineHeight: '1.4',
        }}
      >
        {t('graph.cooccurrence.add_more_tip')}
      </div>
    </>
  );
}
