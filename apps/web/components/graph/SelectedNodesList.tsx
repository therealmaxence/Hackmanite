'use client';

import { ENTITY_COLORS, EntityType } from '@/types/entities';
import { useGraphStore } from '@/store/graphStore';

interface NodeItem {
  id: string;
  label: string;
  type: EntityType | 'FILE';
  color: string;
}

interface Props {
  selectedNodes: NodeItem[];
}

export default function SelectedNodesList({ selectedNodes }: Props) {
  const { selectedNodeIds, setSelectedNodeIds } = useGraphStore();

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
      {selectedNodes.map((node) => {
        const nodeTypeUpper = (node.type || '').toUpperCase() as EntityType | 'FILE';
        const color = node.color || ENTITY_COLORS[nodeTypeUpper] || 'var(--color-text-muted)';
        return (
          <div
            key={node.id}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.25rem 0.5rem',
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${color}`,
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.75rem',
              color: 'var(--color-text)',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: color,
              }}
            />
            <span>{node.label}</span>
            <button
              onClick={() => {
                setSelectedNodeIds(selectedNodeIds.filter((id) => id !== node.id));
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                fontSize: '0.75rem',
                marginLeft: '0.25rem',
                padding: '0 2px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
                opacity: 0.6,
                transition: 'opacity 0.2s, color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.color = 'var(--color-error)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.6';
                e.currentTarget.style.color = 'var(--color-text-muted)';
              }}
              title="Deselect"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
