'use client';

import useSWR from 'swr';
import { useUploadStore } from '@/store/uploadStore';
import { useGraphStore } from '@/store/graphStore';
import Spinner from '@/components/ui/Spinner';
import SelectedNodesList from './SelectedNodesList';
import CooccurringFileCard from './CooccurringFileCard';
import { useTranslation } from '@/lib/i18n';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function MultiNodePanel() {
  const { selectedNodeIds, isPanelOpen, togglePanel, nodes } = useGraphStore();
  const { sessionId } = useUploadStore();
  const { t } = useTranslation();

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
          {t('graph.panel.cooccurring_files')}
        </p>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <Spinner />
          </div>
        ) : data?.files && data.files.length > 0 ? (
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
        )}
      </div>
    </div>
  );
}
