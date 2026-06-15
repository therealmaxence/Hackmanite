import { useRouter } from 'next/navigation';
import SectionCard from './SectionCard';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from '@/lib/i18n';

interface LocalSessionManagerProps {
  isLoadingSessions: boolean;
  sessions: any[];
  sessionId: string | null;
  handleStartNewSession: () => void;
  handleSwitchSession: (session: any) => void;
  handleDeleteSession: (sessionId: string) => void;
  handleDeleteAllSessions: () => void;
}

export default function LocalSessionManager({
  isLoadingSessions,
  sessions,
  sessionId,
  handleStartNewSession,
  handleSwitchSession,
  handleDeleteSession,
  handleDeleteAllSessions,
}: LocalSessionManagerProps) {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <SectionCard
      title={t('session.manager_title')}
      description={t('session.manager_desc')}
    >
      {isLoadingSessions ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <Spinner size={24} />
        </div>
      ) : sessions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: 'var(--color-surface-raised)', borderRadius: 'var(--radius)', border: 'none' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', margin: 0, marginBottom: '1rem' }}>
            {t('session.no_saved_sessions')}
          </p>
          <button
            onClick={handleStartNewSession}
            style={{
              padding: '0.5rem 1.25rem',
              fontSize: '0.8125rem',
              fontWeight: 600,
              background: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
            }}
          >
            {t('session.start_new_btn')}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleDeleteAllSessions}
              style={{
                background: '#2a171d',
                color: '#EF4444',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#3d1d26'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#2a171d'; }}
            >
              {t('session.delete_all_btn')}
            </button>
            
            <button
              onClick={handleStartNewSession}
              style={{
                padding: '0.45rem 1rem',
                fontSize: '0.8125rem',
                fontWeight: 600,
                background: 'var(--color-surface-raised)',
                color: 'var(--color-text)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>+</span> {t('session.start_new_btn')}
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {sessions.map((s) => {
              const isActive = sessionId === s.id;
              return (
                <div
                   key={s.id}
                  style={{
                    padding: '1.25rem',
                    background: isActive ? 'var(--color-surface-hover)' : 'var(--color-surface-raised)',
                    border: 'none',
                    borderRadius: 'var(--radius)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1.5rem',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.8125rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-text)' }}>
                        {t('session.session_prefix')} {s.id.slice(0, 8)}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        • {new Date(s.createdAt).toLocaleDateString()} {new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isActive && (
                        <span style={{
                          fontSize: '0.6875rem', fontWeight: 600, background: '#0e2316',
                          color: '#10B981', border: 'none',
                          borderRadius: 'var(--radius-sm)', padding: '1px 6px',
                        }}>
                          {t('session.active_label')}
                        </span>
                      )}
                    </div>
                    
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t('session.files_label')} {s.fileNames.length > 0 ? s.fileNames.join(', ') + (s.fileCount > 3 ? '...' : '') : t('session.no_files_uploaded')}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                      <span style={{ fontSize: '0.75rem', background: 'var(--color-surface)', border: 'none', borderRadius: 'var(--radius-sm)', padding: '1px 6px', color: 'var(--color-text-muted)' }}>
                        {t('session.files_count', { count: s.fileCount, plural: s.fileCount !== 1 ? 's' : '' })}
                      </span>
                      <span style={{ fontSize: '0.75rem', background: 'var(--color-surface)', border: 'none', borderRadius: 'var(--radius-sm)', padding: '1px 6px', color: 'var(--color-text-muted)' }}>
                        {t('session.entities_count', { count: s.entityCount })}
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {!isActive ? (
                      <button
                        onClick={() => handleSwitchSession(s)}
                        style={{
                          padding: '0.45rem 1rem',
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          background: 'var(--color-primary)',
                          color: 'white',
                          border: 'none',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                        }}
                      >
                        {t('session.activate_btn')}
                      </button>
                    ) : (
                      <button
                        onClick={() => router.push('/graph')}
                        style={{
                          padding: '0.45rem 1rem',
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          background: 'var(--color-surface)',
                          color: 'var(--color-primary)',
                          border: 'none',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                        }}
                      >
                        {t('session.view_graph_btn')}
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleDeleteSession(s.id)}
                      style={{
                        padding: '0.45rem',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      title={t('session.delete_tooltip')}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </SectionCard>
  );
}
