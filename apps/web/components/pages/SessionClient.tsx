'use client';

import Header from '@/components/layout/Header';
import { useSessionManager } from '@/hooks/useSessionManager';

// Extracted Sub-Components
import LocalSessionManager from '@/components/session/LocalSessionManager';
import ExportCard from '@/components/session/ExportCard';
import ImportCard from '@/components/session/ImportCard';

export default function SessionClient() {
  const {
    sessionId,
    sessions,
    isLoadingSessions,
    handleSwitchSession,
    handleDeleteSession,
    handleDeleteAllSessions,
    handleStartNewSession,
  } = useSessionManager();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}>
      <Header />

      <main style={{ flex: 1, overflowY: 'auto', padding: 'clamp(2rem, 5vw, 4rem) clamp(1rem, 5vw, 3rem)' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '3rem' }}>

          {/* Page header */}
          <header>
            <p style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-primary)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
              Session Management
            </p>
            <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 600, color: 'var(--color-text)', margin: 0, lineHeight: 1.2 }}>
              Export &amp; Import
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '0.75rem', lineHeight: 1.6, maxWidth: '520px' }}>
              Import and export your sessions as JSON files.
            </p>
          </header>

          {/* Active session info */}
          <div style={{
            padding: '1rem 1.25rem',
            background: sessionId ? 'var(--color-surface-hover)' : 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
          }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: sessionId ? '#10B981' : '#6B7280', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0, marginBottom: '0.2rem' }}>
                {sessionId ? 'Active session' : 'No active session'}
              </p>
              <p style={{ fontSize: '0.8125rem', fontFamily: 'var(--font-mono)', color: 'var(--color-text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {sessionId ?? 'Upload files on the home page to create a session'}
              </p>
            </div>
          </div>

          {/* Local Session Manager card */}
          <LocalSessionManager
            isLoadingSessions={isLoadingSessions}
            sessions={sessions}
            sessionId={sessionId}
            handleStartNewSession={handleStartNewSession}
            handleSwitchSession={handleSwitchSession}
            handleDeleteSession={handleDeleteSession}
            handleDeleteAllSessions={handleDeleteAllSessions}
          />

          {/* Export card */}
          <ExportCard sessionId={sessionId} />

          {/* Import card */}
          <ImportCard />

          {/* Info note */}
          <div style={{
            padding: '1rem 1.25rem',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius)',
            fontSize: '0.8125rem',
            color: 'var(--color-text-muted)',
            lineHeight: 1.6,
            display: 'flex',
            gap: '0.75rem',
          }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#4C9EF0', flexShrink: 0, paddingTop: '2px' }}>[Info]</span>
            <span>
              Importing a session <strong style={{ color: 'var(--color-text)' }}>replaces</strong> the current active session in this browser tab.
            </span>
          </div>

        </div>
      </main>
    </div>
  );
}
