'use client';

import useSWR from 'swr';
import { useUploadStore } from '@/store/uploadStore';
import { useGraphStore } from '@/store/graphStore';
import { ENTITY_COLORS, EntityType } from '@/types/entities';
import Spinner from '@/components/ui/Spinner';
import { formatBytes } from './SnippetCard';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function MultiNodePanel() {
  const { selectedNodeIds, isPanelOpen, togglePanel, nodes } = useGraphStore();
  const { sessionId } = useUploadStore();

  const selectedNodes = nodes.filter((n) => selectedNodeIds.includes(n.id));

  const { data, isLoading } = useSWR(
    isPanelOpen && selectedNodeIds.length >= 2 && sessionId
      ? `/api/graph/intersect-files?sessionId=${sessionId}&nodeIds=${selectedNodeIds.join(',')}`
      : null,
    fetcher
  );

  if (!isPanelOpen || selectedNodeIds.length < 2) return null;

  return (
    <div
      className="node-panel animate-slide-in"
      style={{
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: 'clamp(400px, 45vw, 650px)',
        background: 'var(--color-surface)',
        borderLeft: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 10,
        transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      <div
        style={{
          padding: '1.5rem 2rem',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '1.25rem',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              fontSize: '1.2rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: '0.75rem',
              lineHeight: 1.3,
            }}
          >
            Intersection Panel
          </h3>
          <p
            style={{
              fontSize: '0.65rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--color-text-muted)',
              marginBottom: '0.75rem',
              fontFamily: 'var(--font-display)',
            }}
          >
            Selected Nodes ({selectedNodes.length})
          </p>
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
        </div>
        <button
          id="close-multi-node-panel"
          onClick={() => togglePanel(false)}
          aria-label="Close details panel"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: 8,
            minWidth: 44,
            minHeight: 44,
            borderRadius: 'var(--radius-sm)',
            lineHeight: 1,
            fontSize: '1.3rem',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-muted)';
          }}
        >
          ×
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '2rem' }}>
        <p
          style={{
            fontSize: '0.65rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--color-text-muted)',
            marginBottom: '1rem',
            fontFamily: 'var(--font-display)',
          }}
        >
          Co-occurring Files
        </p>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <Spinner />
          </div>
        ) : data?.files && data.files.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {data.files.map((file: any) => (
              <div
                key={file.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  padding: '1rem',
                  background: 'rgba(16,0,43,0.4)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: 'var(--color-text)',
                      marginBottom: '0.25rem',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {file.originalName}
                  </h4>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.725rem',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    <span style={{ fontFamily: 'var(--font-mono)' }}>
                      {formatBytes(file.sizeBytes)}
                    </span>
                    <span>•</span>
                    <span style={{ textTransform: 'uppercase' }}>
                      {file.mimeType.split('/').pop()}
                    </span>
                  </div>
                </div>
                <a
                  href={`/api/files/${file.id}/download`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 36,
                    height: 36,
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-primary)',
                    color: 'var(--color-on-primary)',
                    textDecoration: 'none',
                    transition: 'background var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--color-primary-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--color-primary)';
                  }}
                  title="Open File"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              padding: '3rem 1rem',
              textAlign: 'center',
              border: '1px dashed var(--color-border)',
              borderRadius: 'var(--radius)',
              background: 'rgba(255,255,255,0.01)',
            }}
          >
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', margin: 0 }}>
              No files contain all selected nodes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
