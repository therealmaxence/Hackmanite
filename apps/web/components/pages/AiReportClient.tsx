'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import { useUploadStore } from '@/store/uploadStore';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import MarkdownReport from '@/components/ai/MarkdownReport';
import CustomSlider from '@/components/ui/CustomSlider';

export default function AiReportClient() {
  const { sessionId } = useUploadStore();
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState('mistral-large-latest');
  const [focusType, setFocusType] = useState('general');
  const [customInstructions, setCustomInstructions] = useState('');
  const [language, setLanguage] = useState('en');
  const [topEntitiesLimit, setTopEntitiesLimit] = useState(30);
  const [topTfidfLimit, setTopTfidfLimit] = useState(30);
  const [bridgesLimit, setBridgesLimit] = useState(10);
  const [estimatedTokens, setEstimatedTokens] = useState(0);
  const [promptPreview, setPromptPreview] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [showApiSetup, setShowApiSetup] = useState(false);
  const [showAnalysisScope, setShowAnalysisScope] = useState(false);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [report, setReport] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const savedKey = localStorage.getItem('entitygraph_mistral_api_key');
    const savedModel = localStorage.getItem('entitygraph_mistral_model');
    const savedLang = localStorage.getItem('entitygraph_mistral_language');
    const savedTopEnts = localStorage.getItem('entitygraph_mistral_top_entities_limit');
    const savedTopTfidf = localStorage.getItem('entitygraph_mistral_top_tfidf_limit');
    const savedBridges = localStorage.getItem('entitygraph_mistral_bridges_limit');
    if (savedKey) setApiKey(savedKey);
    if (savedModel) setModel(savedModel);
    if (savedLang) setLanguage(savedLang);
    if (savedTopEnts) setTopEntitiesLimit(Number(savedTopEnts));
    if (savedTopTfidf) setTopTfidfLimit(Number(savedTopTfidf));
    if (savedBridges) setBridgesLimit(Number(savedBridges));
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await fetch('/api/ai/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            focusType,
            apiKey: 'dummy_key',
            model,
            customInstructions,
            language,
            topEntitiesLimit,
            topTfidfLimit,
            bridgesLimit,
            previewOnly: true,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setPromptPreview(data.prompt);
          setEstimatedTokens(data.estimatedTokens);
        }
      } catch (err) {
        console.error('Failed to fetch prompt preview:', err);
      }
    }, 250);

    return () => clearTimeout(delayDebounceFn);
  }, [sessionId, focusType, model, customInstructions, language, topEntitiesLimit, topTfidfLimit, bridgesLimit]);

  const handleSaveKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('entitygraph_mistral_api_key', key);
  };

  const handleSaveModel = (mdl: string) => {
    setModel(mdl);
    localStorage.setItem('entitygraph_mistral_model', mdl);
  };

  const handleSaveLanguage = (lang: string) => {
    setLanguage(lang);
    localStorage.setItem('entitygraph_mistral_language', lang);
  };

  const handleSaveTopEntitiesLimit = (val: number) => {
    setTopEntitiesLimit(val);
    localStorage.setItem('entitygraph_mistral_top_entities_limit', String(val));
  };

  const handleSaveTopTfidfLimit = (val: number) => {
    setTopTfidfLimit(val);
    localStorage.setItem('entitygraph_mistral_top_tfidf_limit', String(val));
  };

  const handleSaveBridgesLimit = (val: number) => {
    setBridgesLimit(val);
    localStorage.setItem('entitygraph_mistral_bridges_limit', String(val));
  };

  const generateReport = async () => {
    if (!sessionId) return;
    setIsGenerating(true);
    setError(null);
    setReport('');
    setStatusMsg('Aggregating graph statistics and calculating centrality...');

    setTimeout(() => setStatusMsg('Assembling analytical prompt for Mistral AI...'), 1200);
    setTimeout(() => setStatusMsg('Connecting to Mistral model...'), 2400);

    try {
      const res = await fetch('/api/ai/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          focusType,
          apiKey,
          model,
          customInstructions,
          language,
          topEntitiesLimit,
          topTfidfLimit,
          bridgesLimit,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to generate intelligence report.');
      }

      const data = await res.json();
      setReport(data.report);
    } catch (err: any) {
      setError(err.message || 'Error communicating with the neural service.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadMarkdown = () => {
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const sId = sessionId ? sessionId.slice(0, 8) : 'report';
    a.download = `intelligence-report-${sId}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };



  return (
    <div className="min-h-screen bg-base flex flex-col">
      <Header />
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: #ffffff !important; color: #000000 !important; }
          .no-print, header, nav, button { display: none !important; }
          .print-report { background: transparent !important; padding: 0 !important; border: none !important; }
          .print-report * { color: #000000 !important; }
        }
      `}} />

      <main className="flex-1 overflow-y-auto custom-scrollbar">
        <div
          className="w-full mx-auto flex flex-col"
          style={{
            gap: '3.5rem',
            padding: '4rem 2rem 6rem 2rem',
            maxWidth: '1280px',
            width: '100%',
          }}
        >
          <header className="space-y-4 no-print">
            <h1 className="text-4xl md:text-5xl font-display font-bold text-white leading-tight">AI Intelligence Report</h1>
          </header>

          {!sessionId ? (
            <div className="h-[300px] signature-card flex flex-col items-center justify-center gap-4 border border-dashed border-white/5">
              <p className="text-sm font-mono text-white/30 uppercase tracking-wider">No Active Session Selected</p>
            </div>
          ) : (
            <div className="flex flex-col gap-12">
              
              {/* Settings panel */}
              <div
                className="flex flex-col no-print"
                style={{ gap: '2.5rem' }}
              >
                <div className="signature-card flex flex-col" style={{ padding: '0' }}>
                  {/* Collapsible header */}
                  <button
                    type="button"
                    onClick={() => setShowApiSetup(!showApiSetup)}
                    className="flex justify-between items-center w-full cursor-pointer hover:bg-white/5 transition-colors"
                    style={{ padding: '1.5rem 2rem', background: 'none', border: 'none', outline: 'none' }}
                  >
                    <h3 className="text-sm font-mono uppercase text-white/50 font-semibold tracking-wider">Mistral API Setup</h3>
                    <svg
                      className="w-4 h-4 text-white/40 transition-transform duration-300"
                      style={{ transform: showApiSetup ? 'rotate(180deg)' : 'rotate(0deg)' }}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="m6 9 6 6 6-6" />
                    </svg>
                  </button>

                  {/* Collapsible body */}
                  {showApiSetup && (
                    <div className="flex flex-col border-t border-white/5" style={{ padding: '1.5rem 2rem 2rem', gap: '2rem' }}>
                      <div className="flex flex-col gap-2.5">
                        <label className="text-[11px] text-white/40 font-mono font-medium">API Key</label>
                        <div className="relative">
                          <input
                            type={showKey ? 'text' : 'password'}
                            value={apiKey}
                            onChange={(e) => handleSaveKey(e.target.value)}
                            placeholder="Mistral API Key..."
                            className="signature-input w-full font-mono text-xs"
                            style={{ padding: '0.75rem 1.25rem', paddingRight: '4.5rem' }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowKey(!showKey)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 text-xs font-mono transition-colors"
                          >
                            {showKey ? 'Hide' : 'Show'}
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2.5">
                        <label className="text-[11px] text-white/40 font-mono font-medium">Model</label>
                        <div className="relative">
                          <select
                            value={model}
                            onChange={(e) => handleSaveModel(e.target.value)}
                            className="signature-input w-full appearance-none text-xs cursor-pointer bg-surface-input text-white border-none"
                            style={{ padding: '0.75rem 1.25rem', paddingRight: '2.5rem' }}
                          >
                            <option value="mistral-large-latest">Mistral Large (High quality)</option>
                            <option value="mistral-small-latest">Mistral Small (Fast)</option>
                            <option value="open-mixtral-8x22b">Mixtral 8x22B (Balanced)</option>
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="m6 9 6 6 6-6" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="signature-card flex flex-col" style={{ padding: '0' }}>
                  {/* Collapsible header */}
                  <button
                    type="button"
                    onClick={() => setShowAnalysisScope(!showAnalysisScope)}
                    className="flex justify-between items-center w-full cursor-pointer hover:bg-white/5 transition-colors"
                    style={{ padding: '1.5rem 2rem', background: 'none', border: 'none', outline: 'none' }}
                  >
                    <h3 className="text-sm font-mono uppercase text-white/50 font-semibold tracking-wider">Analysis Scope</h3>
                    <svg
                      className="w-4 h-4 text-white/40 transition-transform duration-300"
                      style={{ transform: showAnalysisScope ? 'rotate(180deg)' : 'rotate(0deg)' }}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="m6 9 6 6 6-6" />
                    </svg>
                  </button>

                  {/* Collapsible body */}
                  {showAnalysisScope && (
                    <div className="flex flex-col border-t border-white/5" style={{ padding: '1.5rem 2rem 2rem', gap: '2rem' }}>
                  
                  <div className="flex flex-col gap-2.5">
                    <label className="text-[11px] text-white/40 font-mono font-medium">Focus Mode</label>
                    <div className="relative">
                      <select
                        value={focusType}
                        onChange={(e) => setFocusType(e.target.value)}
                        className="signature-input w-full appearance-none text-xs cursor-pointer bg-surface-input text-white border-none"
                        style={{ padding: '0.75rem 1.25rem', paddingRight: '2.5rem' }}
                      >
                        <option value="general">Executive Summary (General)</option>
                        <option value="threats">Threat Actors & Targets</option>
                        <option value="networks">Network & Link Clusters</option>
                        <option value="timeline">Temporal & Timeline</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="m6 9 6 6 6-6" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    <label className="text-[11px] text-white/40 font-mono font-medium">Output Language</label>
                    <div className="relative">
                      <select
                        value={language}
                        onChange={(e) => handleSaveLanguage(e.target.value)}
                        className="signature-input w-full appearance-none text-xs cursor-pointer bg-surface-input text-white border-none"
                        style={{ padding: '0.75rem 1.25rem', paddingRight: '2.5rem' }}
                      >
                        <option value="en">English</option>
                        <option value="fr">Français</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="m6 9 6 6 6-6" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <CustomSlider
                    label="Top Entities Limit"
                    value={topEntitiesLimit}
                    min={10}
                    max={100}
                    step={5}
                    onChange={handleSaveTopEntitiesLimit}
                    unit=" nodes"
                  />

                  <CustomSlider
                    label="Top TF-IDF (Salient) Limit"
                    value={topTfidfLimit}
                    min={10}
                    max={100}
                    step={5}
                    onChange={handleSaveTopTfidfLimit}
                    unit=" nodes"
                  />

                  <CustomSlider
                    label="Central Bridges Limit"
                    value={bridgesLimit}
                    min={5}
                    max={30}
                    step={1}
                    onChange={handleSaveBridgesLimit}
                    unit=" nodes"
                  />

                  <div className="flex flex-col gap-2.5">
                    <label className="text-[11px] text-white/40 font-mono font-medium">Custom Directives</label>
                    <textarea
                      value={customInstructions}
                      onChange={(e) => setCustomInstructions(e.target.value)}
                      placeholder="e.g. Focus specifically on connections to domain names or specific dates..."
                      rows={4}
                      className="signature-input w-full text-xs resize-none"
                      style={{ padding: '0.75rem 1.25rem' }}
                    />
                  </div>

                  <Button
                    variant="primary"
                    fullWidth
                    loading={isGenerating}
                    onClick={generateReport}
                    style={{ minHeight: 44, fontSize: '0.875rem', marginTop: '0.5rem' }}
                  >
                    Run AI Analysis
                  </Button>

                  <div className="flex justify-between items-center text-[10px] font-mono text-white/30 px-1 mt-2">
                    <span>Estimated Input Cost:</span>
                    <span className="text-white/60 font-semibold">~{estimatedTokens} tokens</span>
                  </div>

                  <div className="flex flex-col gap-2.5 border-t border-white/5 pt-4 mt-2">
                    <button
                      type="button"
                      onClick={() => setShowPreview(!showPreview)}
                      className="text-xs font-mono text-white/40 hover:text-white/70 transition-colors flex justify-between items-center cursor-pointer"
                      style={{ background: 'none', border: 'none', padding: 0, outline: 'none' }}
                    >
                      <span>{showPreview ? 'Hide Prompt Preview' : 'Show Prompt Preview'}</span>
                      <span>{showPreview ? '▲' : '▼'}</span>
                    </button>
                    
                    {showPreview && (
                      <pre className="signature-input font-mono text-[9px] text-white/50 bg-surface-input p-3 rounded overflow-x-auto max-h-48 max-w-full whitespace-pre-wrap select-all leading-relaxed" style={{ width: '100%' }}>
                        {promptPreview || 'Generating preview...'}
                      </pre>
                    )}
                  </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Report display panel */}
              <div 
                className="flex flex-col print-report" 
                style={{ gap: '1.5rem' }}
              >
                {isGenerating && (
                  <div className="signature-card h-[400px] flex flex-col items-center justify-center gap-4 border border-dashed border-white/5">
                    <Spinner size={28} color="var(--color-primary-hover)" />
                    <p className="text-xs font-mono text-white/40 uppercase tracking-widest animate-pulse">{statusMsg}</p>
                  </div>
                )}

                {error && (
                  <div className="signature-card bg-danger/10 border border-error/20 p-8 flex flex-col gap-3">
                    <h4 className="text-sm font-semibold text-error font-mono">Generation Suspended</h4>
                    <p className="text-xs text-white/50 leading-relaxed">{error}</p>
                  </div>
                )}

                {!isGenerating && !error && !report && (
                  <div className="signature-card h-[400px] flex flex-col items-center justify-center gap-3 border border-dashed border-white/5 text-center p-10">
                    <p className="text-xs font-mono text-white/30 uppercase tracking-widest font-semibold">Ready for Report Generation</p>
                    <p className="text-xs text-white/40 max-w-xs leading-relaxed">Configure your Mistral AI credentials and click "Run AI Analysis" to start.</p>
                  </div>
                )}

                {!isGenerating && report && (
                  <div
                    className="signature-card bg-surface-raised border border-white/5 rounded-lg shadow-2xl print-report flex flex-col"
                    style={{ padding: '2.5rem' }}
                  >
                    {/* Top action header */}
                    <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-6 no-print flex-shrink-0">
                      <span className="text-xs font-mono uppercase text-white/50 font-semibold tracking-wider">Briefing Analysis</span>
                      <div className="flex gap-2" style={{ transform: 'translateY(-6px)' }}>
                        <Button variant="secondary" size="xs" onClick={copyToClipboard}>
                          {copied ? 'Copied!' : 'Copy'}
                        </Button>
                        <Button variant="secondary" size="xs" onClick={downloadMarkdown}>
                          Download MD
                        </Button>
                        <Button variant="secondary" size="xs" onClick={() => window.print()}>
                          Print PDF
                        </Button>
                      </div>
                    </div>

                    {/* Markdown content */}
                    <div className="overflow-y-auto custom-scrollbar pr-2">
                      <MarkdownReport report={report} />
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </main>
    </div>
  );
}
