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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  type TesseractStatus = { found: boolean; path: string | null; platform: string; install_state: string; install_log: string };
  const [tesseract, setTesseract] = useState<TesseractStatus | null>(null);
  const [showTesseractLog, setShowTesseractLog] = useState(false);

  const fetchTesseract = useCallback(async () => {
    try {
      const res = await fetch('/api/tesseract');
      if (res.ok) setTesseract(await res.json());
    } catch { /* NLP service not reachable */ }
  }, []);

  const handleTesseractInstall = async () => {
    if (!tesseract) return;
    if (tesseract.platform === 'win32') {
      const url = 'https://github.com/UB-Mannheim/tesseract/wiki';
      if (typeof window !== 'undefined' && (window as any).electronAPI?.openExternal) {
        (window as any).electronAPI.openExternal(url);
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
      return;
    }
    try {
      await fetch('/api/tesseract', { method: 'POST' });
      setTesseract((prev) => prev ? { ...prev, install_state: 'installing' } : prev);
    } catch { /* ignore */ }
  };

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
    fetchTesseract();
  }, [fetchModels, fetchTesseract]);

  useEffect(() => {
    if (!downloadingModel) return;
    const interval = setInterval(fetchModels, 3000);
    return () => clearInterval(interval);
  }, [downloadingModel, fetchModels]);

  useEffect(() => {
    if (tesseract?.install_state !== 'installing') return;
    const interval = setInterval(fetchTesseract, 3000);
    return () => clearInterval(interval);
  }, [tesseract?.install_state, fetchTesseract]);

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

  const handleDeleteModel = async (modelId: string) => {
    try {
      const res = await fetch('/api/spacy-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', model: modelId }),
      });
      if (res.ok) fetchModels();
    } catch (err) {
      console.error(err);
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
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'relative' }}>
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: 'var(--color-surface-raised)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-text)',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    outline: 'none',
                  }}
                >
                  <span>
                    {language === 'fr' ? 'Gérer et télécharger des modèles...' : 'Manage & Download Models...'}
                  </span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s',
                    }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {isDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0,
                      right: 0,
                      zIndex: 100,
                      background: 'var(--color-surface) var(--noise-bg)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius)',
                      boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                      maxHeight: '350px',
                      overflowY: 'auto',
                    }}
                  >
                    <div style={{ position: 'relative' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={language === 'fr' ? 'Rechercher une langue...' : 'Search languages...'}
                        className="signature-input"
                        style={{ width: '100%', height: 38, paddingLeft: 36, paddingRight: 12, fontSize: '0.8125rem' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
                      ]
                        .filter((lang) =>
                          lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          lang.code.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map((lang) => {
                          const size = selectedSizes[lang.code] || 'sm';
                          const modelId = (lang.code === 'en' || lang.code === 'zh') ? `${lang.code}_core_web_${size}` : `${lang.code}_core_news_${size}`;
                          const model = modelSettings.models.find((m) => m.id === modelId) || { id: modelId, name: `${lang.name} (${size})`, status: 'not_installed' };

                          const installedSizes = modelSettings.models
                            .filter((m) => m.lang === lang.code && m.status === 'installed')
                            .map((m) => m.id.split('_').pop())
                            .filter(Boolean);

                          return (
                            <div key={lang.code} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.03)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', minWidth: '100px' }}>
                                  <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text)' }}>{lang.name}</span>
                                  <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>{modelId}</span>
                                  {installedSizes.length > 0 && (
                                    <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 500, marginTop: '2px' }}>
                                      {language === 'fr' ? `Dispo: ${installedSizes.join(', ')}` : `Available: ${installedSizes.join(', ')}`}
                                    </span>
                                  )}
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
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 500 }}>
                                      {language === 'fr' ? 'Installé' : 'Installed'}
                                    </span>
                                    <button
                                      onClick={() => handleDeleteModel(model.id)}
                                      style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--color-text-muted)',
                                        cursor: 'pointer',
                                        padding: '0.25rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'color 0.15s',
                                        outline: 'none',
                                      }}
                                      onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
                                      title={language === 'fr' ? 'Supprimer' : 'Delete'}
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="3 6 5 6 21 6" />
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                        <line x1="10" y1="11" x2="10" y2="17" />
                                        <line x1="14" y1="11" x2="14" y2="17" />
                                      </svg>
                                    </button>
                                  </div>
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
                )}
              </div>
            </div>
          </div>

          {/* Tesseract OCR */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text)' }}>{t('tesseract.title')}</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{t('tesseract.desc')}</p>
            </div>

            {!tesseract ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                <Spinner size={12} />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{
                    fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    background: tesseract.found ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    color: tesseract.found ? '#10b981' : '#ef4444',
                    border: `1px solid ${tesseract.found ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  }}>
                    {tesseract.found ? t('tesseract.status_found') : t('tesseract.status_not_found')}
                  </span>
                  {tesseract.found && tesseract.path && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {t('tesseract.path_label')}: {tesseract.path}
                    </span>
                  )}
                  <button
                    onClick={fetchTesseract}
                    title={t('tesseract.btn_reload')}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '0.25rem', display: 'flex', alignItems: 'center', outline: 'none', marginLeft: 'auto' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                    </svg>
                  </button>
                </div>

                {tesseract.platform === 'win32' && !tesseract.found && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>{t('tesseract.windows_note')}</p>
                )}

                {tesseract.install_state === 'done' && (
                  <p style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 500 }}>{t('tesseract.success')}</p>
                )}
                {tesseract.install_state === 'error' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <p style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 500 }}>{t('tesseract.error')}</p>
                    <button
                      onClick={() => setShowTesseractLog((v) => !v)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '0.7rem', textAlign: 'left', padding: 0, outline: 'none' }}
                    >
                      {showTesseractLog ? '▾' : '▸'} {t('tesseract.log_label')}
                    </button>
                    {showTesseractLog && (
                      <pre style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>
                        {tesseract.install_log}
                      </pre>
                    )}
                  </div>
                )}

                {!tesseract.found && tesseract.install_state !== 'done' && (
                  <Button
                    id="tesseract-install-btn"
                    size="sm"
                    variant="secondary"
                    onClick={handleTesseractInstall}
                    disabled={tesseract.install_state === 'installing'}
                    style={{ alignSelf: 'flex-start', fontSize: '0.8125rem' }}
                  >
                    {tesseract.install_state === 'installing'
                      ? <><Spinner size={12} />&nbsp;{t('tesseract.btn_installing')}</>
                      : tesseract.platform === 'win32'
                        ? t('tesseract.btn_open_page')
                        : t('tesseract.btn_install')
                    }
                  </Button>
                )}
              </div>
            )}
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
