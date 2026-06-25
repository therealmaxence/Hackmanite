'use client';

import { useState } from 'react';
import { useTranslation } from '@/lib/i18n';

interface GraphContextMenuProps {
  x: number;
  y: number;
  nodeId: string;
  nodeType: string;
  nodeLabel: string;
  onCopyName: (label: string) => void;
  onChangeType: (id: string, newType: string) => void;
  onHideNode: (id: string, label: string) => void;
  onDeleteNode: (id: string, type: string, label: string) => void;
  onModifyNode: (id: string) => void;
}

export default function GraphContextMenu({
  x,
  y,
  nodeId,
  nodeType,
  nodeLabel,
  onCopyName,
  onChangeType,
  onHideNode,
  onDeleteNode,
  onModifyNode,
}: GraphContextMenuProps) {
  const { t } = useTranslation();
  const [showTypeSelector, setShowTypeSelector] = useState(false);

  const buttonStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: 'var(--color-text)',
    fontSize: '0.8rem',
    fontWeight: 500,
    padding: '6px 12px',
    textAlign: 'left',
    cursor: 'pointer',
    borderRadius: 'var(--radius-xs)',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>, isDanger = false) => {
    e.currentTarget.style.background = isDanger ? 'rgba(238,50,84,0.1)' : 'rgba(255,255,255,0.05)';
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = 'transparent';
  };

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        left: x,
        top: y,
        zIndex: 1000,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-sm)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(8px)',
        padding: '4px',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        minWidth: '150px',
      }}
    >
      <button
        onClick={() => onCopyName(nodeLabel)}
        style={buttonStyle}
        onMouseEnter={(e) => handleMouseEnter(e)}
        onMouseLeave={handleMouseLeave}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        {t('graph.canvas.copy_name')}
      </button>

      {nodeType !== 'FILE' && (
        <button
          onClick={() => onModifyNode(nodeId)}
          style={buttonStyle}
          onMouseEnter={(e) => handleMouseEnter(e)}
          onMouseLeave={handleMouseLeave}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Modify
        </button>
      )}

      {nodeType !== 'FILE' && (
        <>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '6px 12px',
              color: 'var(--color-text)',
              fontSize: '0.8rem',
              fontWeight: 500,
              width: '100%',
              gap: '4px',
            }}
          >
            <div
              onClick={() => setShowTypeSelector(!showTypeSelector)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                userSelect: 'none',
                width: '100%',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </svg>
              <span style={{ flex: 1 }}>{t('graph.canvas.type_label')}</span>
              <span
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--color-primary)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  border: '1px solid var(--color-border)',
                  fontWeight: 600,
                }}
              >
                {nodeType} {showTypeSelector ? '▲' : '▼'}
              </span>
            </div>

            {showTypeSelector && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '4px',
                  marginTop: '6px',
                  padding: '4px',
                  background: 'var(--color-surface-raised)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-xs)',
                }}
              >
                {[
                  'PERSON',
                  'ORGANIZATION',
                  'LOCATION',
                  'EMAIL',
                  'PHONE',
                  'IP_ADDRESS',
                  'URL',
                  'DATE',
                  'ADDRESS',
                ].map((typeOption) => (
                  <button
                    key={typeOption}
                    onClick={() => onChangeType(nodeId, typeOption)}
                    style={{
                      background: nodeType === typeOption ? 'var(--color-primary)' : 'transparent',
                      border: 'none',
                      color: nodeType === typeOption ? '#000' : 'var(--color-text)',
                      fontSize: '0.65rem',
                      padding: '4px 6px',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontWeight: 600,
                      transition: 'all 0.1s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (nodeType !== typeOption) e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                    }}
                    onMouseLeave={(e) => {
                      if (nodeType !== typeOption) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {typeOption.replace('_', ' ')}
                  </button>
                ))}
              </div>
            )}
          </div>

        </>
      )}

      <button
        onClick={() => onHideNode(nodeId, nodeLabel)}
        style={buttonStyle}
        onMouseEnter={(e) => handleMouseEnter(e)}
        onMouseLeave={handleMouseLeave}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
        {t('graph.canvas.hide_node')}
      </button>

      <button
        onClick={() => onDeleteNode(nodeId, nodeType, nodeLabel)}
        style={{ ...buttonStyle, color: 'var(--color-error)' }}
        onMouseEnter={(e) => handleMouseEnter(e, true)}
        onMouseLeave={handleMouseLeave}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
        {t('graph.canvas.delete_node')}
      </button>
    </div>
  );
}
