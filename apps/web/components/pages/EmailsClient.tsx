'use client';
import { useState, useCallback, useEffect } from 'react';
import useSWR from 'swr';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import Spinner from '@/components/ui/Spinner';
import { useUploadStore } from '@/store/uploadStore';
import { useTranslation } from '@/lib/i18n';
import { EmailNodeData, EmailStats, LayoutType, ActiveTab } from '@/components/emails/types';
import { useSenderColors, emailToNodeData } from '@/components/emails/utils';
import { useEmailFilters } from '@/components/emails/hooks/useEmailFilters';
import { useEmailElements } from '@/components/emails/hooks/useEmailGraph';
import KpiRibbon from '@/components/emails/KpiRibbon';
import FiltersPanel from '@/components/emails/FiltersPanel';
import EmailDAGCanvas from '@/components/emails/EmailDAGCanvas';
import EmailListView from '@/components/emails/EmailListView';
import EmailDetailDrawer from '@/components/emails/EmailDetailDrawer';

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const DEFAULT_STATS: EmailStats = { totalEmails: 0, totalSenders: 0, totalRecipients: 0, totalAttachments: 0, totalThreads: 0 };

export default function EmailsClient() {
  const { sessionId } = useUploadStore();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const [selectedEmail, setSelectedEmail] = useState<EmailNodeData | null>(null);
  const [focusedThreadRootId, setFocusedThreadRootId] = useState<string | null>(null);
  const [layoutType, setLayoutType] = useState<LayoutType>('breadthfirst');
  const [searchQuery, setSearchQuery] = useState(() => searchParams?.get('search') || '');
  const [senderFilter, setSenderFilter] = useState('all');
  const [recipientFilter, setRecipientFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<ActiveTab>('graph');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    const query = searchParams?.get('search');
    if (query !== undefined && query !== null) setSearchQuery(query);
  }, [searchParams]);

  const { data, isLoading, mutate } = useSWR(sessionId ? `/api/emails?sessionId=${sessionId}` : null, fetcher, { revalidateOnFocus: false });

  const rawEmails: Record<string, unknown>[] = data?.emails ?? [];
  const rawNodes: Record<string, unknown>[]  = data?.dag?.nodes ?? [];
  const rawEdges = data?.dag?.edges ?? [];
  const stats: EmailStats = data?.stats ?? DEFAULT_STATS;

  const { filteredEmails, filterOptions } = useEmailFilters({ rawEmails, rawEdges, focusedThreadRootId, senderFilter, recipientFilter, searchQuery });
  const senderColors = useSenderColors(filterOptions.senders);
  const elements = useEmailElements(filteredEmails, rawNodes, rawEdges, senderColors);

  const handleSelectFromList = useCallback((email: Record<string, unknown>) => {
    setSelectedEmail(emailToNodeData(email));
    setActiveTab('graph');
  }, []);

  const handleDeleteEmail = useCallback(async (messageId: string, subject: string) => {
    if (!confirm(t('emails.confirm_delete', { subject }))) return;
    try {
      setSelectedEmail(null);
      const res = await fetch(`/api/emails?messageId=${encodeURIComponent(messageId)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete email');
      mutate();
    } catch (err) {
      console.error('Failed to delete email', err);
    }
  }, [mutate, t]);

  if (isLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}>
        <Header />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', padding: '2rem' }}>
          <Spinner size={32} />
          <p style={{ fontSize: '0.875rem', fontFamily: 'var(--font-mono, monospace)', color: 'var(--color-text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{t('emails.loading_db')}</p>
        </div>
      </div>
    );
  }

  if (rawEmails.length === 0) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}>
        <Header />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', padding: '2rem' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5" style={{ opacity: 0.3 }}>
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
          </svg>
          <div style={{ textAlign: 'center', maxWidth: '400px' }}>
            <h3 style={{ color: 'var(--color-text)', fontSize: '1rem', fontWeight: 500, marginBottom: '0.5rem' }}>{t('emails.empty_title')}</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', lineHeight: '1.4' }}>{t('emails.empty_desc')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)', overflow: 'hidden' }}>
      <Header />
      <KpiRibbon stats={stats} />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        <div
          className="collapsible-sidebar"
          style={{
            width: isSidebarCollapsed ? 0 : 280,
            minWidth: isSidebarCollapsed ? 0 : 280,
          }}
        >
          <FiltersPanel
            searchQuery={searchQuery} onSearchChange={setSearchQuery} senderFilter={senderFilter} onSenderChange={setSenderFilter}
            recipientFilter={recipientFilter} onRecipientChange={setRecipientFilter} filterOptions={filterOptions}
            focusedThreadRootId={focusedThreadRootId} onResetFocus={() => setFocusedThreadRootId(null)} activeTab={activeTab}
            onTabChange={setActiveTab} layoutType={layoutType} onLayoutChange={setLayoutType}
          />
        </div>
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="sidebar-toggle-btn"
          style={{ left: isSidebarCollapsed ? '12px' : 'calc(280px - 14px)' }}
          title={isSidebarCollapsed ? t('graph.controls.expand') || 'Expand' : t('graph.controls.collapse') || 'Collapse'}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: isSidebarCollapsed ? 'rotate(0deg)' : 'rotate(180deg)',
              transition: 'transform 0.3s ease',
            }}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {activeTab === 'graph' ? (
            <EmailDAGCanvas elements={elements} layoutType={layoutType} onNodeSelect={setSelectedEmail} onBackgroundTap={() => setSelectedEmail(null)} selectedEmailId={selectedEmail?.messageId || selectedEmail?.id || null} />
          ) : (
            <EmailListView emails={filteredEmails} selectedEmail={selectedEmail} senderColors={senderColors} onSelectEmail={handleSelectFromList} />
          )}
          {selectedEmail && (
            <EmailDetailDrawer
              email={selectedEmail} senderColors={senderColors} rawEdges={rawEdges} rawEmails={rawEmails} onSelectEmail={handleSelectFromList}
              focusedThreadRootId={focusedThreadRootId} onClose={() => setSelectedEmail(null)} onFocusThread={(id) => { setFocusedThreadRootId(id); setActiveTab('graph'); }}
              onResetFocus={() => setFocusedThreadRootId(null)} onDelete={() => handleDeleteEmail(selectedEmail.messageId, selectedEmail.subject)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
