'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import { EmailNodeData, LayoutType } from './types';
import { useEmailGraph } from './hooks/useEmailGraph';
import { useTranslation } from '@/lib/i18n';
import { useUploadStore } from '@/store/uploadStore';
import EmailContextMenu from './EmailContextMenu';
import ModifyNodeModal from '../graph/ModifyNodeModal';
import ZoomControls from '../ui/ZoomControls';

interface EmailDAGCanvasProps {
  elements: Record<string, unknown>[]; layoutType: LayoutType;
  onNodeSelect: (data: EmailNodeData) => void; onBackgroundTap: () => void;
  selectedEmailId: string | null;
}

export default function EmailDAGCanvas({ elements, layoutType, onNodeSelect, onBackgroundTap, selectedEmailId }: EmailDAGCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  const { sessionId } = useUploadStore();

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    nodeId: string;
    nodeSubject: string;
    nodeData: EmailNodeData;
  } | null>(null);

  const [editingEmail, setEditingEmail] = useState<EmailNodeData | null>(null);

  const handleNodeRightClick = useCallback((data: EmailNodeData, x: number, y: number) => {
    setContextMenu({ x, y, nodeId: data.messageId, nodeSubject: data.subject, nodeData: data });
  }, []);

  const handleBackgroundTap = useCallback(() => {
    setContextMenu(null);
    onBackgroundTap();
  }, [onBackgroundTap]);

  const handleCopySubject = useCallback((subject: string) => {
    navigator.clipboard?.writeText(subject).catch(() => {});
    setContextMenu(null);
  }, []);

  const handleModifyEmail = useCallback(() => {
    if (contextMenu) {
      setEditingEmail(contextMenu.nodeData);
    }
    setContextMenu(null);
  }, [contextMenu]);

  const cyRef = useEmailGraph({
    containerRef,
    elements,
    layoutType,
    activeTab: 'graph',
    onNodeSelect,
    onBackgroundTap: handleBackgroundTap,
    selectedEmailId,
    onNodeRightClick: handleNodeRightClick,
  });

  const zoomIn = useCallback(() => cyRef.current?.zoom(cyRef.current.zoom() * 1.2), [cyRef]);
  const zoomOut = useCallback(() => cyRef.current?.zoom(cyRef.current.zoom() / 1.2), [cyRef]);
  const fitGraph = useCallback(() => cyRef.current?.fit(undefined, 40), [cyRef]);

  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', background: 'var(--bg-base)' }} />
      <ZoomControls onZoomIn={zoomIn} onZoomOut={zoomOut} onFit={fitGraph} />

      <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', background: 'var(--color-surface-raised) var(--noise-bg)', borderRadius: 'var(--radius)', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.6875rem', color: 'var(--color-text-muted)', zIndex: 50, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-secondary)', display: 'inline-block' }} />
          <span>{t('emails.canvas.node_desc')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '14px', height: '2px', background: '#2C3545', display: 'inline-block' }} />
          <span>{t('emails.canvas.reply_flow')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '14px', height: '0px', borderTop: '2px dashed #EC4899', display: 'inline-block' }} />
          <span>{t('emails.canvas.fwd_flow')}</span>
        </div>
      </div>

      {contextMenu && (
        <EmailContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeId={contextMenu.nodeId}
          nodeSubject={contextMenu.nodeSubject}
          onCopySubject={handleCopySubject}
          onModify={handleModifyEmail}
        />
      )}

      {editingEmail && (
        <ModifyNodeModal
          nodeId={editingEmail.messageId}
          nodeType="EMAIL_NODE"
          initialEmailData={editingEmail}
          sessionId={sessionId!}
          onClose={() => setEditingEmail(null)}
        />
      )}
    </div>
  );
}
