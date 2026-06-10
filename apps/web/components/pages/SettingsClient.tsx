'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/layout/Header';
import { useUploadStore } from '@/store/uploadStore';
import WindowSizeSelector from '@/components/upload/WindowSizeSelector';
import Button from '@/components/ui/Button';
import RotaryKnob from '@/components/ui/RotaryKnob';

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
        setSaveStatus({ type: 'success', message: 'Global default settings saved successfully! Future sessions will inherit these values.' });
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
          setSaveStatus({ type: 'success', message: 'Settings saved successfully! Caches cleared.' });
        } else {
          throw new Error('Failed to save settings');
        }
      }
    } catch (err: any) {
      setSaveStatus({ type: 'error', message: err.message || 'Error occurred while saving settings.' });
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
              Proximity &amp; Projections
            </p>
            <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 600, color: 'var(--color-text)', margin: 0, lineHeight: 1.2 }}>
              Session Settings
            </h1>
          </header>

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
                Session to Configure:
              </label>
              {isLoadingSessions ? (
                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Loading sessions...</div>
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
                    [Global Defaults] (Will apply to current session)
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
                <span>Files: {selectedSessionMeta.fileCount}</span>
                <span>Entities: {selectedSessionMeta.entityCount}</span>
              </div>
            )}
          </div>

          {selectedSessionId && !isLoadingSettings && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Part 1: Interactive Character Window Selector (slider moved here!) */}
              <div>
                <WindowSizeSelector windowSize={windowSize} setWindowSize={setWindowSize} />
              </div>

              {/* Part 2: Graph Render Defaults (Tactile Dials Rack Console) */}
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
                      Extraction Console Tuning
                    </h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      Drag dials up/down or use your scroll wheel to adjust graph filters.
                    </p>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: '1.5rem',
                      width: '100%',
                    }}
                  >
                    <RotaryKnob
                      label="Minimum Connections"
                      value={minConnections}
                      min={1}
                      max={10}
                      step={1}
                      onChange={setMinConnections}
                      unit=" edges"
                      description="Minimum connections for an entity node to appear."
                    />

                    <RotaryKnob
                      label="Minimum Occurrences"
                      value={minOccurrences}
                      min={1}
                      max={20}
                      step={1}
                      onChange={setMinOccurrences}
                      unit=" counts"
                      description="Minimum frequency of occurrence across files."
                    />

                    <RotaryKnob
                      label="Co-occurrence Strength"
                      value={minEdgeWeight}
                      min={0.0}
                      max={1.0}
                      step={0.05}
                      onChange={setMinEdgeWeight}
                      description="Minimum connection strength (edge weight)."
                    />

                    <RotaryKnob
                      label="TF-IDF Importance"
                      value={minTfidf}
                      min={0.0}
                      max={50.0}
                      step={0.5}
                      onChange={setMinTfidf}
                      description="Minimum TF-IDF score to visualize node."
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
                {isSaving ? 'Saving session settings…' : 'Save Session Settings'}
              </Button>

            </div>
          )}

          {selectedSessionId && isLoadingSettings && (
            <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem', padding: '3rem 0' }}>
              Fetching settings for selected session...
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
