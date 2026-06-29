'use client';
import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/layout/Header';
import { useUploadStore } from '@/store/uploadStore';
import WindowSizeSelector from '@/components/upload/WindowSizeSelector';
import Button from '@/components/ui/Button';
import CustomSlider from '@/components/ui/CustomSlider';
import { useTranslation } from '@/lib/i18n';
import Spinner from '@/components/ui/Spinner';

interface SessionSettings { windowSize: number; minConnections: number; minOccurrences: number; minEdgeWeight: number; minTfidf: number; }

export default function SettingsClient() {
  const { sessionId: activeSessionId } = useUploadStore();
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('default');
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [windowSize, setWindowSize] = useState(400);
  const [minConnections, setMinConnections] = useState(2);
  const [minOccurrences, setMinOccurrences] = useState(2);
  const [minEdgeWeight, setMinEdgeWeight] = useState(0.0);
  const [minTfidf, setMinTfidf] = useState(0.0);

  const { t, language, setLanguage } = useTranslation();

  const [modelSettings, setModelSettings] = useState<{ models: any[]; selected: string }>({ models: [], selected: 'auto' });
  const [downloadingModel, setDownloadingModel] = useState<string | null>(null);
  const [selectedSizes, setSelectedSizes] = useState<Record<string, 'sm' | 'md' | 'lg'>>({
    en: 'lg', fr: 'lg', ru: 'lg', es: 'sm', de: 'sm', zh: 'sm', ja: 'sm', pt: 'sm', it: 'sm', nl: 'sm',
    pl: 'sm', el: 'sm', ro: 'sm', ca: 'sm', hr: 'sm', da: 'sm', fi: 'sm', ko: 'sm', nb: 'sm', sv: 'sm', uk: 'sm'
  });

  const fetchModels = useCallback(async () => {
    try {
      const res = await fetch('/api/spacy-models');
      if (res.ok) {
        const data = await res.json();
        setModelSettings(data);
        const activeDownload = data.models.find((m: any) => m.status === 'downloading');
        setDownloadingModel(activeDownload ? activeDownload.id : null);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  useEffect(() => {
    if (!downloadingModel) return;
    const interval = setInterval(fetchModels, 3000);
    return () => clearInterval(interval);
  }, [downloadingModel, fetchModels]);

  const handleSelectModel = async (modelId: string) => {
    try {
      const res = await fetch('/api/spacy-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'select', model: modelId }),
      });
      if (res.ok) fetchModels();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadModel = async (modelId: string) => {
    setDownloadingModel(modelId);
    try {
      await fetch('/api/spacy-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'download', model: modelId }),
      });
      fetchModels();
    } catch (err) {
      console.error(err);
      setDownloadingModel(null);
    }
  };

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/session');
      if (res.ok) {
        setSessions(await res.json());
        setSelectedSessionId(activeSessionId || 'default');
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  }, [activeSessionId]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const fetchSettings = useCallback(async (sid: string) => {
    if (!sid) return;
    setIsLoadingSettings(true);
    setSaveStatus(null);
    try {
      if (sid === 'default') {
        const local = localStorage.getItem('entitygraph_default_settings');
        const data = local ? JSON.parse(local) : {};
        setWindowSize(data.windowSize ?? 400);
        setMinConnections(data.minConnections ?? 2);
        setMinOccurrences(data.minOccurrences ?? 2);
        setMinEdgeWeight(data.minEdgeWeight ?? 0.0);
        setMinTfidf(data.minTfidf ?? 0.0);
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
    if (selectedSessionId) fetchSettings(selectedSessionId);
  }, [selectedSessionId, fetchSettings]);

  const handleSaveSettings = async () => {
    if (!selectedSessionId) return;
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const settings = { windowSize, minConnections, minOccurrences, minEdgeWeight, minTfidf };
      if (selectedSessionId === 'default') {
        localStorage.setItem('entitygraph_default_settings', JSON.stringify(settings));
        setSaveStatus({ type: 'success', message: t('settings.success_global') });
      } else {
        const res = await fetch(`/api/session/${selectedSessionId}/settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings),
        });
        if (res.ok) setSaveStatus({ type: 'success', message: t('settings.success_session') });
        else throw new Error(t('settings.error_save'));
      }
    } catch (err: any) {
      setSaveStatus({ type: 'error', message: err.message || t('settings.error_save') });
    } finally {
      setIsSaving(false);
    }
  };

  const selectedSessionMeta = sessions.find((s) => s.id === selectedSessionId);

  const langBtnStyle = (lang: string) => {
    const isSelected = language === lang;
    return {
      flex: 1, padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)',
      border: isSelected ? '1px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.08)',
      background: isSelected ? 'var(--color-surface-hover)' : 'var(--color-surface-raised)',
      color: isSelected ? 'var(--color-primary-hover)' : 'var(--color-text-muted)',
      fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center',
      justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s',
      boxShadow: isSelected ? 'var(--glow-trace)' : 'none',
    } as const;
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}>
      <Header />
      <main style={{ flex: 1, overflowY: 'auto', padding: 'clamp(2rem, 5vw, 4rem) clamp(1rem, 5vw, 3rem)' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          <header>
            <p style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-primary)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>{t('settings.kicker')}</p>
            <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 600, color: 'var(--color-text)', margin: 0, lineHeight: 1.2 }}>{t('settings.title')}</h1>
          </header>

          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text)' }}>{t('language.title')}</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{t('language.desc')}</p>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setLanguage('en')} style={langBtnStyle('en')}>{t('language.en')}</button>
              <button onClick={() => setLanguage('fr')} style={langBtnStyle('fr')}>{t('language.fr')}</button>
            </div>
          </div>

          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text)' }}>
                {language === 'fr' ? "Modèles d'extraction d'entités" : "Entity Extraction Models"}
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                {language === 'fr' 
                  ? "Configurez le modèle spaCy utilisé lors de l'extraction ou téléchargez des langues supplémentaires." 
                  : "Configure the spaCy model used during entity extraction, or download additional language models."}
              </p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--color-surface-raised)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text)' }}>
                  {language === 'fr' ? "Langue d'extraction active" : "Active Extraction Language"}
                </span>
                <select
                  value={modelSettings.selected}
                  onChange={(e) => handleSelectModel(e.target.value)}
                  style={{ padding: '0.5rem 1rem', background: '#120108', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)', fontSize: '0.875rem', outline: 'none', cursor: 'pointer' }}
                >
                  <option value="auto">{language === 'fr' ? 'Détection automatique' : 'Auto-detect'}</option>
                  {modelSettings.models
                    .filter((m) => m.status === 'installed')
                    .map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))
                  }
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {language === 'fr' ? 'Modèles disponibles' : 'Available Models'}
                </span>
                
                {[
                  { code: 'en', name: language === 'fr' ? 'Anglais' : 'English' },
                  { code: 'fr', name: language === 'fr' ? 'Français' : 'French' },
                  { code: 'ru', name: language === 'fr' ? 'Russe' : 'Russian' },
                  { code: 'es', name: language === 'fr' ? 'Espagnol' : 'Spanish' },
                  { code: 'de', name: language === 'fr' ? 'Allemand' : 'German' },
                  { code: 'zh', name: language === 'fr' ? 'Chinois' : 'Chinese' },
                  { code: 'ja', name: language === 'fr' ? 'Japonais' : 'Japanese' },
                  { code: 'pt', name: language === 'fr' ? 'Portugais' : 'Portuguese' },
                  { code: 'it', name: language === 'fr' ? 'Italien' : 'Italian' },
                  { code: 'nl', name: language === 'fr' ? 'Néerlandais' : 'Dutch' },
                  { code: 'pl', name: language === 'fr' ? 'Polonais' : 'Polish' },
                  { code: 'el', name: language === 'fr' ? 'Grec' : 'Greek' },
                  { code: 'ro', name: language === 'fr' ? 'Roumain' : 'Romanian' },
                  { code: 'ca', name: language === 'fr' ? 'Catalan' : 'Catalan' },
                  { code: 'hr', name: language === 'fr' ? 'Croate' : 'Croatian' },
                  { code: 'da', name: language === 'fr' ? 'Danois' : 'Danish' },
                  { code: 'fi', name: language === 'fr' ? 'Finnois' : 'Finnish' },
                  { code: 'ko', name: language === 'fr' ? 'Coréen' : 'Korean' },
                  { code: 'nb', name: language === 'fr' ? 'Norvégien (Bokmål)' : 'Norwegian (Bokmål)' },
                  { code: 'sv', name: language === 'fr' ? 'Suédois' : 'Swedish' },
                  { code: 'uk', name: language === 'fr' ? 'Ukrainien' : 'Ukrainian' },
                ].map((lang) => {
                  const size = selectedSizes[lang.code] || 'sm';
                  const modelId = (lang.code === 'en' || lang.code === 'zh') ? `${lang.code}_core_web_${size}` : `${lang.code}_core_news_${size}`;
                  const model = modelSettings.models.find((m) => m.id === modelId) || { id: modelId, name: `${lang.name} (${size})`, status: 'not_installed' };
                  
                  return (
                    <div key={lang.code} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: '100px' }}>
                          <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text)' }}>{lang.name}</span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>{modelId}</span>
                        </div>
                        <select
                          value={size}
                          onChange={(e) => setSelectedSizes({ ...selectedSizes, [lang.code]: e.target.value as 'sm' | 'md' | 'lg' })}
                          style={{ padding: '0.25rem 0.5rem', background: '#120108', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text-muted)', fontSize: '0.72rem', cursor: 'pointer', outline: 'none' }}
                        >
                          <option value="sm">{language === 'fr' ? 'Petit (sm)' : 'Small (sm)'}</option>
                          <option value="md">{language === 'fr' ? 'Moyen (md)' : 'Medium (md)'}</option>
                          <option value="lg">{language === 'fr' ? 'Grand (lg)' : 'Large (lg)'}</option>
                        </select>
                      </div>
                      <div>
                        {model.status === 'downloading' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--color-primary)' }}>
                            <Spinner size={12} />
                            <span>{language === 'fr' ? 'Téléchargement...' : 'Downloading...'}</span>
                          </div>
                        ) : model.status === 'installed' ? (
                          <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 500 }}>
                            {language === 'fr' ? 'Installé' : 'Installed'}
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleDownloadModel(model.id)}
                            disabled={downloadingModel !== null}
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}
                          >
                            {language === 'fr' ? 'Télécharger' : 'Download'}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>{t('settings.select_label')}</label>
              {isLoadingSessions ? (
                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{t('settings.loading_sessions')}</div>
              ) : (
                <select
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 1rem', background: '#120108', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)', fontSize: '0.875rem', outline: 'none', cursor: 'pointer' }}
                >
                  <option value="default" style={{ background: 'var(--color-surface)' }}>{t('settings.global_defaults')}</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id} style={{ background: 'var(--color-surface)' }}>
                      {s.fileNames.join(', ') || t('settings.new_session_placeholder')} ({s.id.slice(0, 8)}...) {s.id === activeSessionId ? ` ${t('settings.active_tag')}` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {selectedSessionMeta && (
              <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                <span>{t('settings.files_count', { count: selectedSessionMeta.fileCount })}</span>
                <span>{t('settings.entities_count', { count: selectedSessionMeta.entityCount })}</span>
              </div>
            )}
          </div>

          {selectedSessionId && !isLoadingSettings && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <WindowSizeSelector windowSize={windowSize} setWindowSize={setWindowSize} />
              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text)' }}>{t('settings.tuning_title')}</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{t('settings.tuning_desc')}</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', width: '100%' }}>
                  <CustomSlider label={t('settings.min_connections')} value={minConnections} min={1} max={10} step={1} onChange={setMinConnections} unit={t('settings.unit_edges')} description={t('settings.min_connections_desc')} />
                  <CustomSlider label={t('settings.min_occurrences')} value={minOccurrences} min={1} max={20} step={1} onChange={setMinOccurrences} unit={t('settings.unit_counts')} description={t('settings.min_occurrences_desc')} />
                  <CustomSlider label={t('settings.cooccurrence_strength')} value={minEdgeWeight} min={0.0} max={1.0} step={0.05} onChange={setMinEdgeWeight} description={t('settings.cooccurrence_strength_desc')} />
                  <CustomSlider label={t('settings.tfidf_importance')} value={minTfidf} min={0.0} max={100000.0} isLog={true} onChange={setMinTfidf} description={t('settings.tfidf_importance_desc')} />
                </div>
              </div>

              {saveStatus && (
                <div style={{ padding: '0.875rem 1.25rem', borderRadius: 'var(--radius)', fontSize: '0.8125rem', fontWeight: 500, lineHeight: 1.5, border: `1px solid ${saveStatus.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`, background: 'var(--color-surface)', color: saveStatus.type === 'success' ? '#10b981' : '#ef4444' }}>
                  {saveStatus.message}
                </div>
              )}

              <Button id="save-settings-btn" variant="primary" size="lg" onClick={handleSaveSettings} disabled={isSaving} style={{ fontFamily: 'var(--font-display)', width: '280px', padding: '0.875rem', alignSelf: 'center' }}>
                {isSaving ? t('settings.save_btn_saving') : t('settings.save_btn_idle')}
              </Button>
            </div>
          )}

          {selectedSessionId && isLoadingSettings && (
            <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem', padding: '3rem 0' }}>{t('settings.loading_settings')}</div>
          )}
        </div>
      </main>
    </div>
  );
}
