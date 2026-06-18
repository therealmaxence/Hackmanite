'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from '@/lib/i18n';
import { useGraphStore } from '@/store/graphStore';
import { useUploadStore } from '@/store/uploadStore';
import CooccurrenceSelectionView from './CooccurrenceSelectionView';
import CooccurrenceResultsView from './CooccurrenceResultsView';

interface SearchResultFile {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  processedAt: string | null;
  snippets: string[];
}

export default function CooccurrenceModal() {
  const { t } = useTranslation();
  const { sessionId } = useUploadStore();
  const {
    nodes,
    cooccurrenceNodeIds,
    removeCooccurrenceNodeId,
    clearCooccurrenceNodeIds,
    isCooccurrenceModalOpen,
    setCooccurrenceModalOpen,
  } = useGraphStore();

  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultFile[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedNodes = cooccurrenceNodeIds
    .map((id) => nodes.find((n) => n.id === id))
    .filter(Boolean) as Array<{ id: string; label: string; type: string }>;

  useEffect(() => {
    if (!isCooccurrenceModalOpen) {
      setSearchResults(null);
      setError(null);
      setIsSearching(false);
    }
  }, [isCooccurrenceModalOpen]);

  if (!isCooccurrenceModalOpen) return null;

  const handleSearch = async () => {
    if (selectedNodes.length < 2) return;
    setIsSearching(true);
    setError(null);
    setSearchResults(null);

    try {
      const nodeIds = selectedNodes.map((n) => n.id).join(',');
      const res = await fetch(
        `/api/graph/cooccurrence?sessionId=${sessionId}&nodeIds=${encodeURIComponent(nodeIds)}`
      );
      if (!res.ok) throw new Error(`Search failed: ${res.statusText}`);
      const data = await res.json();
      setSearchResults(data.files || []);
    } catch (err: any) {
      setError(err.message || 'An error occurred during search.');
    } finally {
      setIsSearching(false);
    }
  };

  const searchLabels = selectedNodes.map((n) => n.label);
  const isResultsView = searchResults !== null || isSearching || error !== null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(18, 1, 8, 0.82)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius)',
          width: '90%',
          maxWidth: 540,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.6)',
          animation: 'fadeIn 0.25s ease-out',
        }}
      >
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--color-text)' }}>
            {isResultsView ? t('graph.cooccurrence.results_title') : t('graph.cooccurrence.title')}
          </h2>
          <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
            {isResultsView ? t('graph.cooccurrence.results_subtitle') : t('graph.cooccurrence.subtitle')}
          </span>
        </div>

        <div
          style={{
            padding: 24,
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
          className="custom-scrollbar"
        >
          {isSearching ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '40px 0' }}>
              <Spinner size={24} />
              <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                {t('graph.cooccurrence.loading')}
              </span>
            </div>
          ) : error ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, color: 'var(--color-error)' }}>
              <span style={{ fontSize: '0.875rem' }}>⚠ {error}</span>
            </div>
          ) : searchResults ? (
            <CooccurrenceResultsView files={searchResults} searchLabels={searchLabels} t={t} />
          ) : (
            <CooccurrenceSelectionView
              nodes={selectedNodes}
              onRemove={removeCooccurrenceNodeId}
              onClear={clearCooccurrenceNodeIds}
              t={t}
            />
          )}
        </div>

        <div
          style={{
            padding: 18,
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 12,
          }}
        >
          {isResultsView ? (
            <>
              <Button size="sm" variant="ghost" onClick={() => { setSearchResults(null); setError(null); }}>
                {t('graph.cooccurrence.btn_back')}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setCooccurrenceModalOpen(false)}>
                {t('graph.cooccurrence.btn_close')}
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="ghost" onClick={() => setCooccurrenceModalOpen(false)}>
                {t('graph.hidden.btn_cancel')}
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={handleSearch}
                disabled={selectedNodes.length < 2 || isSearching}
              >
                {t('graph.cooccurrence.btn_search')}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
