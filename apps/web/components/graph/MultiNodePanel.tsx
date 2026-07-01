'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useUploadStore } from '@/store/uploadStore';
import { useGraphStore } from '@/store/graphStore';
import Spinner from '@/components/ui/Spinner';
import SelectedNodesList from './SelectedNodesList';
import CooccurringFileCard from './CooccurringFileCard';
import { useTranslation } from '@/lib/i18n';
import { ENTITY_COLORS, EntityType } from '@/types/entities';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface NodeItem {
  id: string;
  label: string;
  type: EntityType | 'FILE';
  color: string;
}

function HighlightText({ text, selectedNodes }: { text: string; selectedNodes: NodeItem[] }) {
  if (!selectedNodes || selectedNodes.length === 0) return <>{text}</>;
  const escaped = selectedNodes
    .map((n) => n.label.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'))
    .filter(Boolean);
  if (escaped.length === 0) return <>{text}</>;

  const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) => {
        const matchingNode = selectedNodes.find((n) => n.label.toLowerCase() === part.toLowerCase());
        if (matchingNode) {
          const nodeTypeUpper = (matchingNode.type || '').toUpperCase() as EntityType | 'FILE';
          const color = matchingNode.color || ENTITY_COLORS[nodeTypeUpper] || '#f59e0b';
          return (
            <mark
              key={i}
              style={{
                background: `${color}1A`,
                color: color,
                border: `1px solid ${color}4D`,
                borderRadius: '2px',
                padding: '0 2px',
                fontWeight: 600,
              }}
            >
              {part}
            </mark>
          );
        }
        return part;
      })}
    </>
  );
}

export default function MultiNodePanel() {
  const { selectedNodeIds, isPanelOpen, togglePanel, nodes } = useGraphStore();
  const { sessionId } = useUploadStore();
  const { t } = useTranslation();
  const [cooccurrenceMode, setCooccurrenceMode] = useState<'file' | 'text'>('file');

  const selectedNodes = nodes.filter((n) => selectedNodeIds.includes(n.id));

  const { data, isLoading } = useSWR(
    isPanelOpen && selectedNodeIds.length >= 2 && sessionId
      ? cooccurrenceMode === 'file'
        ? `/api/graph/intersect-files?sessionId=${sessionId}&nodeIds=${selectedNodeIds.join(',')}`
        : `/api/graph/cooccurrence?sessionId=${sessionId}&nodeIds=${selectedNodeIds.join(',')}`
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
        borderLeft: 'none',
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
          background: 'var(--color-surface-raised)',
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
            {t('graph.panel.intersection_title')}
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
            {t('graph.panel.selected_nodes', { count: selectedNodes.length })}
          </p>
          <SelectedNodesList selectedNodes={selectedNodes} />
        </div>
        <button
          id="close-multi-node-panel"
          onClick={() => togglePanel(false)}
          aria-label={t('graph.panel.close_aria')}
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
        <div style={{ display: 'flex', background: 'var(--color-surface-input)', padding: '3px', borderRadius: 'var(--radius)', border: 'none', marginBottom: '1.5rem' }}>
          {(['file', 'text'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setCooccurrenceMode(mode)}
              style={{
                flex: 1,
                padding: '0.5rem 0',
                fontSize: '0.8125rem',
                background: cooccurrenceMode === mode ? 'var(--color-primary)' : 'transparent',
                color: cooccurrenceMode === mode ? 'var(--color-on-primary)' : 'var(--color-text)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'background 0.15s ease-in-out',
              }}
            >
              {mode === 'file' ? t('graph.cooccurrence.mode_file') : t('graph.cooccurrence.mode_text')}
            </button>
          ))}
        </div>

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
          {cooccurrenceMode === 'file' ? t('graph.panel.cooccurring_files') : t('graph.cooccurrence.results_title')}
        </p>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <Spinner />
          </div>
        ) : cooccurrenceMode === 'file' ? (
          data?.files && data.files.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {data.files.map((file: any) => (
                <CooccurringFileCard key={file.id} file={file} />
              ))}
            </div>
          ) : (
            <div
              style={{
                padding: '3rem 1rem',
                textAlign: 'center',
                border: 'none',
                borderRadius: 'var(--radius)',
                background: 'var(--color-surface-raised)',
              }}
            >
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', margin: 0 }}>
                {t('graph.panel.no_cooccurring_files')}
              </p>
            </div>
          )
        ) : (
          data?.files && data.files.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {data.files.map((file: any) => (
                <div
                  key={file.id}
                  style={{
                    background: 'var(--color-surface-raised)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius)',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <a
                      href={`/api/files/${file.id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: '0.875rem',
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
                      {file.mimeType.split('/').pop()?.toUpperCase()}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {file.snippets?.map((snippet: string, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          background: 'rgba(0, 0, 0, 0.2)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '10px 12px',
                          fontSize: '0.8125rem',
                          lineHeight: '1.4',
                          color: 'var(--color-text-dim)',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        <HighlightText text={snippet} selectedNodes={selectedNodes} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                padding: '3rem 1rem',
                textAlign: 'center',
                border: 'none',
                borderRadius: 'var(--radius)',
                background: 'var(--color-surface-raised)',
              }}
            >
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', margin: 0 }}>
                {t('graph.cooccurrence.no_results')}
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
