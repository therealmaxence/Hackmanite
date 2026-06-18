'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useUploadStore } from '@/store/uploadStore';

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('Failed to fetch weak signals');
  return res.json();
});

export interface WeakSignalItem {
  id: string;
  label: string;
  type: string;
  score: number;
}

export interface SelectedWeakSignal {
  id: string;
  label: string;
  type: string;
  score: number;
  methodology: string;
}

export function useAiReport() {
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
  const [showWeakSignalsSelector, setShowWeakSignalsSelector] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [report, setReport] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [selectedWeakSignals, setSelectedWeakSignals] = useState<SelectedWeakSignal[]>([]);

  const { data: weakSignalsData } = useSWR<{
    bridgeSignals: Array<WeakSignalItem & { totalCount: number; fileCount: number }>;
    nicheSignals: Array<WeakSignalItem & { totalCount: number; fileCount: number }>;
    emergingSignals: Array<WeakSignalItem & { totalCount: number; fileCount: number }>;
  }>(sessionId ? `/api/stats/weak-signals?sessionId=${sessionId}` : null, fetcher);

  const handleToggleWeakSignal = (item: WeakSignalItem, methodology: string) => {
    setSelectedWeakSignals((prev) => {
      const exists = prev.some((x) => x.id === item.id);
      if (exists) {
        return prev.filter((x) => x.id !== item.id);
      } else {
        return [...prev, { id: item.id, label: item.label, type: item.type, score: item.score, methodology }];
      }
    });
  };

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
            selectedWeakSignals,
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
  }, [
    sessionId,
    focusType,
    model,
    customInstructions,
    language,
    topEntitiesLimit,
    topTfidfLimit,
    bridgesLimit,
    selectedWeakSignals,
  ]);

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
    setStatusMsg('ai.status.aggregating');

    const t1 = setTimeout(() => setStatusMsg('ai.status.assembling'), 1200);
    const t2 = setTimeout(() => setStatusMsg('ai.status.connecting'), 2400);

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
          selectedWeakSignals,
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
      clearTimeout(t1);
      clearTimeout(t2);
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

  return {
    sessionId,
    apiKey,
    showKey,
    setShowKey,
    model,
    focusType,
    setFocusType,
    customInstructions,
    setCustomInstructions,
    language,
    topEntitiesLimit,
    topTfidfLimit,
    bridgesLimit,
    estimatedTokens,
    promptPreview,
    showPreview,
    setShowPreview,
    showApiSetup,
    setShowApiSetup,
    showAnalysisScope,
    setShowAnalysisScope,
    showWeakSignalsSelector,
    setShowWeakSignalsSelector,
    isGenerating,
    statusMsg,
    report,
    error,
    copied,
    selectedWeakSignals,
    weakSignalsData,
    handleToggleWeakSignal,
    handleSaveKey,
    handleSaveModel,
    handleSaveLanguage,
    handleSaveTopEntitiesLimit,
    handleSaveTopTfidfLimit,
    handleSaveBridgesLimit,
    generateReport,
    copyToClipboard,
    downloadMarkdown,
  };
}
