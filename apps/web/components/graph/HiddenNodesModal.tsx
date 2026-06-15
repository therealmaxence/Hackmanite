'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from '@/lib/i18n';

interface HiddenNode {
  id: string;
  displayName: string;
  type: string;
}

interface HiddenNodesModalProps {
  sessionId: string;
  onClose: () => void;
  onUnhideSuccess?: () => void;
}

export default function HiddenNodesModal({
  sessionId,
  onClose,
  onUnhideSuccess,
}: HiddenNodesModalProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hiddenNodes, setHiddenNodes] = useState<HiddenNode[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    fetch(`/api/session/${sessionId}/hidden-nodes`)
      .then((res) => {
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!active) return;
        const nodes = data.nodes || [];
        setHiddenNodes(nodes);
        setSelectedIds(new Set(nodes.map((n: HiddenNode) => n.id)));
        setIsLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        console.error('Failed to load hidden nodes', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch hidden nodes');
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [sessionId]);

  const handleToggleNode = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleRestoreAll = () => {
    setSelectedIds(new Set());
  };

  const handleKeepAll = () => {
    setSelectedIds(new Set(hiddenNodes.map((n) => n.id)));
  };

  const handleSave = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const remainingHiddenArray = Array.from(selectedIds);
      const res = await fetch(`/api/session/${sessionId}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hiddenNodeIds: JSON.stringify(remainingHiddenArray),
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to update settings: ${res.statusText}`);
      }

      if (onUnhideSuccess) {
        onUnhideSuccess();
      }
      onClose();
    } catch (err: unknown) {
      console.error('Failed to update hidden nodes', err);
      setError(err instanceof Error ? err.message : 'Failed to update hidden nodes');
    } finally {
      setIsProcessing(false);
    }
  };

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
          maxWidth: 480,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.6)',
          animation: 'fadeIn 0.25s ease-out',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--color-text)' }}>
            {t('graph.hidden.title')}
          </h2>
          <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
            {t('graph.hidden.subtitle')}
          </span>
        </div>

        {/* Content */}
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
          {isLoading ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                padding: 40,
              }}
            >
              <Spinner size={24} />
              <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                {t('graph.hidden.loading')}
              </span>
            </div>
          ) : error ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, color: 'var(--color-error)' }}>
              <span style={{ fontSize: '0.875rem' }}>⚠ {error}</span>
              <Button size="sm" onClick={onClose} variant="ghost" style={{ alignSelf: 'center' }}>
                {t('graph.hidden.btn_cancel')}
              </Button>
            </div>
          ) : hiddenNodes.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 0',
                color: 'var(--color-text-muted)',
                fontSize: '0.875rem',
              }}
            >
              {t('graph.hidden.no_hidden')}
            </div>
          ) : (
            <>
              {/* Toolbar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                  {t('graph.hidden.status', { count: selectedIds.size, total: hiddenNodes.length })}
                </span>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={handleRestoreAll}
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
                  <span style={{ color: 'var(--color-border)', fontSize: '0.72rem' }}>|</span>
                  <button
                    onClick={handleKeepAll}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-text-muted)',
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    {t('graph.hidden.keep_all')}
                  </button>
                </div>
              </div>

              {/* Node List */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  background: '#120108',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius)',
                  padding: 12,
                  maxHeight: 300,
                  overflowY: 'auto',
                }}
                className="custom-scrollbar"
              >
                {hiddenNodes.map((node) => (
                  <label
                    key={node.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      fontSize: '0.82rem',
                      color: selectedIds.has(node.id)
                        ? 'var(--color-text-muted)'
                        : 'var(--color-text)',
                      cursor: 'pointer',
                      userSelect: 'none',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      background: selectedIds.has(node.id) ? 'transparent' : 'rgba(255, 255, 255, 0.03)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(node.id)}
                      onChange={() => handleToggleNode(node.id)}
                      style={{ accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: selectedIds.has(node.id) ? 400 : 500 }}>
                        {node.displayName}
                      </span>
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
                    </div>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: 18,
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 12,
          }}
        >
          <Button size="sm" variant="ghost" onClick={onClose} disabled={isProcessing}>
            {t('graph.hidden.btn_cancel')}
          </Button>
          {!isLoading && !error && hiddenNodes.length > 0 && (
            <Button
              size="sm"
              variant="primary"
              onClick={handleSave}
              loading={isProcessing}
            >
              {t('graph.hidden.btn_save')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
