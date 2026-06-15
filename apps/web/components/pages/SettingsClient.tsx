'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/layout/Header';
import { useUploadStore } from '@/store/uploadStore';
import WindowSizeSelector from '@/components/upload/WindowSizeSelector';
import Button from '@/components/ui/Button';
import CustomSlider from '@/components/ui/CustomSlider';
import { useTranslation } from '@/lib/i18n';

interface SessionSettings {
  windowSize: number;
  minConnections: number;
  minOccurrences: number;
  minEdgeWeight: number;
  minTfidf: number;
}

export default function SettingsClient() {
  const { sessionId: activeSessionId } = useUploadStore();
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('default');
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Settings State
  const [windowSize, setWindowSize] = useState(400);
  const [minConnections, setMinConnections] = useState(2);
  const [minOccurrences, setMinOccurrences] = useState(2);
  const [minEdgeWeight, setMinEdgeWeight] = useState(0.0);
  const [minTfidf, setMinTfidf] = useState(0.0);

  const { t, language, setLanguage } = useTranslation();

  // Fetch all saved sessions
  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/session');
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
        // Default to active session if available, else global defaults
        if (activeSessionId) {
          setSelectedSessionId(activeSessionId);
        } else {
          setSelectedSessionId('default');
        }
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  }, [activeSessionId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Fetch settings when selected session changes
  const fetchSettings = useCallback(async (sid: string) => {
    if (!sid) return;
    setIsLoadingSettings(true);
    setSaveStatus(null);
    try {
      if (sid === 'default') {
        const local = localStorage.getItem('entitygraph_default_settings');
        if (local) {
          const data = JSON.parse(local);
          setWindowSize(data.windowSize ?? 400);
          setMinConnections(data.minConnections ?? 2);
          setMinOccurrences(data.minOccurrences ?? 2);
          setMinEdgeWeight(data.minEdgeWeight ?? 0.0);
          setMinTfidf(data.minTfidf ?? 0.0);
        } else {
          // Defaults if no local settings are found
          setWindowSize(400);
          setMinConnections(2);
          setMinOccurrences(2);
          setMinEdgeWeight(0.0);
          setMinTfidf(0.0);
        }
      } else {
        const res = await fetch(`/api/session/${sid}/settings`);
        if (res.ok) {
          const data: SessionSettings = await res.json();
          setWindowSize(data.windowSize ?? 400);
          setMinConnections(data.minConnections ?? 2);
          setMinOccurrences(data.minOccurrences ?? 2);
          setMinEdgeWeight(data.minEdgeWeight ?? 0.0);
          setMinTfidf(data.minTfidf ?? 0.0);
        }
      }
    } catch (err) {
      console.error('Failed to fetch session settings:', err);
    } finally {
      setIsLoadingSettings(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSessionId) {
      fetchSettings(selectedSessionId);
    }
  }, [selectedSessionId, fetchSettings]);

  // Handle Save Settings
  const handleSaveSettings = async () => {
    if (!selectedSessionId) return;
    setIsSaving(true);
    setSaveStatus(null);
    try {
      if (selectedSessionId === 'default') {
        const settings = { windowSize, minConnections, minOccurrences, minEdgeWeight, minTfidf };
        localStorage.setItem('entitygraph_default_settings', JSON.stringify(settings));
        setSaveStatus({ type: 'success', message: t('settings.success_global') });
      } else {
        const res = await fetch(`/api/session/${selectedSessionId}/settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            windowSize,
            minConnections,
            minOccurrences,
            minEdgeWeight,
            minTfidf,
          }),
        });

        if (res.ok) {
          setSaveStatus({ type: 'success', message: t('settings.success_session') });
        } else {
          throw new Error(t('settings.error_save'));
        }
      }
    } catch (err: any) {
      setSaveStatus({ type: 'error', message: err.message || t('settings.error_save') });
    } finally {
      setIsSaving(false);
    }
  };

  const selectedSessionMeta = sessions.find((s) => s.id === selectedSessionId);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}>
      <Header />

      <main style={{ flex: 1, overflowY: 'auto', padding: 'clamp(2rem, 5vw, 4rem) clamp(1rem, 5vw, 3rem)' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          
          {/* Header */}
          <header>
            <p style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-primary)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
              {t('settings.kicker')}
            </p>
            <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 600, color: 'var(--color-text)', margin: 0, lineHeight: 1.2 }}>
              {t('settings.title')}
            </h1>
          </header>

          {/* Premium Language Settings Card */}
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius)',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text)' }}>
                {t('language.title')}
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                {t('language.desc')}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => setLanguage('en')}
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  border: language === 'en' ? '1px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.08)',
                  background: language === 'en' ? 'var(--color-surface-hover)' : 'var(--color-surface-raised)',
                  color: language === 'en' ? 'var(--color-primary-hover)' : 'var(--color-text-muted)',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s',
                  boxShadow: language === 'en' ? 'var(--glow-trace)' : 'none',
                }}
              >
                <span>🇺🇸</span> {t('language.en')}
              </button>
              <button
                onClick={() => setLanguage('fr')}
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  border: language === 'fr' ? '1px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.08)',
                  background: language === 'fr' ? 'var(--color-surface-hover)' : 'var(--color-surface-raised)',
                  color: language === 'fr' ? 'var(--color-primary-hover)' : 'var(--color-text-muted)',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s',
                  boxShadow: language === 'fr' ? 'var(--glow-trace)' : 'none',
                }}
              >
                <span>🇫🇷</span> {t('language.fr')}
              </button>
            </div>
          </div>

          {/* Session Selector Card */}
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius)',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>
                {t('settings.select_label')}
              </label>
              {isLoadingSessions ? (
                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{t('settings.loading_sessions')}</div>
              ) : (
                <select
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: '#120108',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-text)',
                    fontSize: '0.875rem',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="default" style={{ background: 'var(--color-surface)' }}>
                    {t('settings.global_defaults')}
                  </option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id} style={{ background: 'var(--color-surface)' }}>
                     {s.fileNames.join(', ') || 'New Session'} ({s.id.slice(0, 8)}...) {s.id === activeSessionId ? '[Active]' : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedSessionMeta && (
              <div
                style={{
                  display: 'flex',
                  gap: '1.5rem',
                  fontSize: '0.75rem',
                  color: 'var(--color-text-muted)',
                  borderTop: '1px solid var(--color-border)',
                  paddingTop: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                <span>{t('settings.files_count', { count: selectedSessionMeta.fileCount })}</span>
                <span>{t('settings.entities_count', { count: selectedSessionMeta.entityCount })}</span>
              </div>
            )}
          </div>

          {selectedSessionId && !isLoadingSettings && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Part 1: Interactive Character Window Selector */}
              <div>
                <WindowSizeSelector windowSize={windowSize} setWindowSize={setWindowSize} />
              </div>

              {/* Part 2: Graph Render Defaults (Tuning Console) */}
              <div>  
                <div
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius)',
                    padding: '2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2rem',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text)' }}>
                      {t('settings.tuning_title')}
                    </h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {t('settings.tuning_desc')}
                    </p>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                      gap: '1.5rem',
                      width: '100%',
                    }}
                  >
                    <CustomSlider
                      label={t('settings.min_connections')}
                      value={minConnections}
                      min={1}
                      max={10}
                      step={1}
                      onChange={setMinConnections}
                      unit={t('settings.unit_edges')}
                      description={t('settings.min_connections_desc')}
                    />

                    <CustomSlider
                      label={t('settings.min_occurrences')}
                      value={minOccurrences}
                      min={1}
                      max={20}
                      step={1}
                      onChange={setMinOccurrences}
                      unit={t('settings.unit_counts')}
                      description={t('settings.min_occurrences_desc')}
                    />

                    <CustomSlider
                      label={t('settings.cooccurrence_strength')}
                      value={minEdgeWeight}
                      min={0.0}
                      max={1.0}
                      step={0.05}
                      onChange={setMinEdgeWeight}
                      description={t('settings.cooccurrence_strength_desc')}
                    />

                    <CustomSlider
                      label={t('settings.tfidf_importance')}
                      value={minTfidf}
                      min={0.0}
                      max={100000.0}
                      isLog={true}
                      onChange={setMinTfidf}
                      description={t('settings.tfidf_importance_desc')}
                    />
                  </div>
                </div>
              </div>

              {/* Status Banner */}
              {saveStatus && (
                <div
                  style={{
                    padding: '0.875rem 1.25rem',
                    borderRadius: 'var(--radius)',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    lineHeight: 1.5,
                    border: `1px solid ${saveStatus.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    background: 'var(--color-surface)',
                    color: saveStatus.type === 'success' ? '#10b981' : '#ef4444',
                  }}
                >
                  {saveStatus.message}
                </div>
              )}

              {/* Action Button */}
              <Button
                id="save-settings-btn"
                variant="primary"
                size="lg"
                onClick={handleSaveSettings}
                disabled={isSaving}
                style={{ fontFamily: 'var(--font-display)', width: '280px', padding: '0.875rem', alignSelf: 'center' }}
              >
                {isSaving ? t('settings.save_btn_saving') : t('settings.save_btn_idle')}
              </Button>

            </div>
          )}

          {selectedSessionId && isLoadingSettings && (
            <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem', padding: '3rem 0' }}>
              {t('settings.loading_settings')}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
