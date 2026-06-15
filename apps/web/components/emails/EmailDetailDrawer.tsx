'use client';

import { useState } from 'react';
import { EmailNodeData } from './types';
import { findThreadRoot, collectThreadMessageIds } from './utils';
import EmailContentTab from './EmailContentTab';
import EmailThreadTimeline from './EmailThreadTimeline';
import { useTranslation } from '@/lib/i18n';

interface Props {
  email: EmailNodeData;
  senderColors: Record<string, string>;
  rawEdges: Array<{ data: { source: string; target: string } }>;
  rawEmails: Record<string, unknown>[];
  onSelectEmail: (email: Record<string, unknown>) => void;
  focusedThreadRootId: string | null;
  onClose: () => void;
  onFocusThread: (rootId: string) => void;
  onResetFocus: () => void;
  onDelete: () => void;
}

export default function EmailDetailDrawer({ email, senderColors, rawEdges, rawEmails, onSelectEmail, focusedThreadRootId, onClose, onFocusThread, onResetFocus, onDelete }: Props) {
  const [activeTab, setActiveTab] = useState<'content' | 'timeline'>('content');
  const { t } = useTranslation();

  const fromColor = senderColors[email.from.toLowerCase()] || 'var(--color-text)';
  const threadRootId = findThreadRoot(email.messageId, rawEdges);
  const threadMessageIds = collectThreadMessageIds(threadRootId, rawEdges);
  const threadEmails = rawEmails
    .filter((e) => threadMessageIds.has(e.messageId as string))
    .sort((a, b) => (a.date ? new Date(a.date as string).getTime() : 0) - (b.date ? new Date(b.date as string).getTime() : 0));

  const tabStyle = (tab: 'content' | 'timeline') => ({
    flex: 1,
    padding: '0.75rem',
    background: 'transparent',
    border: 'none',
    borderBottom: activeTab === tab ? '2px solid var(--color-primary)' : '2px solid transparent',
    color: activeTab === tab ? 'var(--color-text)' : 'var(--color-text-muted)',
    fontWeight: activeTab === tab ? 600 : 400,
    fontSize: '0.8125rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  });

  return (
    <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 420, zIndex: 60, background: 'var(--color-surface)', borderLeft: 'none', display: 'flex', flexDirection: 'column', animation: 'slideIn 0.25s cubic-bezier(0.16,1,0.3,1) forwards' }}>
      <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>

      <div style={{ padding: '1.25rem', borderBottom: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.7rem', background: 'color-mix(in srgb, var(--color-primary) 15%, var(--color-surface-raised))', border: 'none', borderRadius: 'var(--radius-sm)', padding: '2px 8px', color: 'var(--color-primary)', fontWeight: 500, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>{t('emails.drawer.node_title')}</span>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '1.125rem', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
      </div>

      <div style={{ display: 'flex', borderBottom: 'none', background: 'var(--color-surface-input)' }}>
        <button onClick={() => setActiveTab('content')} style={tabStyle('content')}>{t('emails.drawer.tab_content')}</button>
        <button onClick={() => setActiveTab('timeline')} style={tabStyle('timeline')}>
          {t('emails.drawer.tab_timeline')}
          <span style={{ background: 'var(--color-surface-raised)', padding: '1px 6px', borderRadius: 'var(--radius-sm)', fontSize: '0.6875rem', color: 'var(--color-text)' }}>{threadEmails.length}</span>
        </button>
      </div>

      <div style={{ flex: 1, padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {activeTab === 'content' ? (
          <EmailContentTab
            email={email}
            fromColor={fromColor}
            isFocused={focusedThreadRootId === email.messageId}
            onFocusThread={() => onFocusThread(threadRootId)}
            onResetFocus={onResetFocus}
            onDelete={onDelete}
          />
        ) : (
          <EmailThreadTimeline
            currentEmail={email}
            threadEmails={threadEmails}
            threadRootId={threadRootId}
            senderColors={senderColors}
            onSelectEmail={onSelectEmail}
          />
        )}
      </div>
    </div>
  );
}
