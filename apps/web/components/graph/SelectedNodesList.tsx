'use client';

import { ENTITY_COLORS, EntityType } from '@/types/entities';

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
          </div>
        );
      })}
    </div>
  );
}
