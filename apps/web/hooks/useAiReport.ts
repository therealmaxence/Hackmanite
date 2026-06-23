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
  const [apiProvider, setApiProvider] = useState('mistral');
  const [apiEndpoint, setApiEndpoint] = useState('https://api.mistral.ai/v1');
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
    setSelectedWeakSignals((prev) =>
      prev.some((x) => x.id === item.id)
        ? prev.filter((x) => x.id !== item.id)
        : [...prev, { ...item, methodology }]
    );
  };

  const handleToggleCategoryWeakSignals = (items: WeakSignalItem[], methodology: string, checked: boolean) => {
    setSelectedWeakSignals((prev) => {
      const filtered = prev.filter((x) => !items.some((item) => item.id === x.id));
      return checked ? [...filtered, ...items.map((item) => ({ ...item, methodology }))] : filtered;
    });
  };

  const handleToggleAllWeakSignals = (checked: boolean) => {
    if (!weakSignalsData) return;
    if (!checked) return setSelectedWeakSignals([]);
    const categories: Array<[keyof typeof weakSignalsData, string]> = [
      ['bridgeSignals', 'Bridge'],
      ['nicheSignals', 'Niche'],
      ['emergingSignals', 'Emerging'],
    ];
    setSelectedWeakSignals(
      categories.flatMap(([k, methodology]) =>
        (weakSignalsData[k] || []).map((ws: any) => ({ ...ws, methodology }))
      )
    );
  };

  useEffect(() => {
    const keys: Array<[string, (v: any) => void, boolean?]> = [
      ['entitygraph_ai_provider', setApiProvider],
      ['entitygraph_ai_endpoint', setApiEndpoint],
      ['entitygraph_mistral_api_key', setApiKey],
      ['entitygraph_mistral_model', setModel],
      ['entitygraph_mistral_language', setLanguage],
      ['entitygraph_mistral_top_entities_limit', setTopEntitiesLimit, true],
      ['entitygraph_mistral_top_tfidf_limit', setTopTfidfLimit, true],
      ['entitygraph_mistral_bridges_limit', setBridgesLimit, true],
    ];
    keys.forEach(([k, set, isNum]) => {
      const val = localStorage.getItem(k);
      if (val !== null) set(isNum ? Number(val) : val);
    });
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await fetch('/api/ai/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId, focusType, apiProvider, apiEndpoint, apiKey: 'dummy_key',
            model, customInstructions, language, topEntitiesLimit, topTfidfLimit,
            bridgesLimit, previewOnly: true, selectedWeakSignals,
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
    sessionId, focusType, apiProvider, apiEndpoint, model, customInstructions,
    language, topEntitiesLimit, topTfidfLimit, bridgesLimit, selectedWeakSignals,
  ]);

  const updateSetting = <T,>(key: string, val: T, setter: (v: T) => void) => {
    setter(val);
    localStorage.setItem(key, String(val));
  };

  const handleSaveKey = (key: string) => updateSetting('entitygraph_mistral_api_key', key, setApiKey);
  const handleSaveModel = (mdl: string) => updateSetting('entitygraph_mistral_model', mdl, setModel);
  const handleSaveLanguage = (lang: string) => updateSetting('entitygraph_mistral_language', lang, setLanguage);
  const handleSaveTopEntitiesLimit = (val: number) => updateSetting('entitygraph_mistral_top_entities_limit', val, setTopEntitiesLimit);
  const handleSaveTopTfidfLimit = (val: number) => updateSetting('entitygraph_mistral_top_tfidf_limit', val, setTopTfidfLimit);
  const handleSaveBridgesLimit = (val: number) => updateSetting('entitygraph_mistral_bridges_limit', val, setBridgesLimit);
  const handleSaveProvider = (provider: string) => updateSetting('entitygraph_ai_provider', provider, setApiProvider);
  const handleSaveEndpoint = (endpoint: string) => updateSetting('entitygraph_ai_endpoint', endpoint, setApiEndpoint);

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
          sessionId, focusType, apiProvider, apiEndpoint, apiKey, model,
          customInstructions, language, topEntitiesLimit, topTfidfLimit,
          bridgesLimit, selectedWeakSignals,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to generate intelligence report.');
      setReport((await res.json()).report);
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
    a.download = `intelligence-report-${sessionId ? sessionId.slice(0, 8) : 'report'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return {
    sessionId, apiProvider, apiEndpoint, apiKey, showKey, setShowKey, model, focusType,
    setFocusType, customInstructions, setCustomInstructions, language, topEntitiesLimit,
    topTfidfLimit, bridgesLimit, estimatedTokens, promptPreview, showPreview, setShowPreview,
    showApiSetup, setShowApiSetup, showAnalysisScope, setShowAnalysisScope, showWeakSignalsSelector,
    setShowWeakSignalsSelector, isGenerating, statusMsg, report, error, copied, selectedWeakSignals,
    weakSignalsData, handleToggleWeakSignal, handleToggleCategoryWeakSignals, handleToggleAllWeakSignals,
    handleSaveProvider, handleSaveEndpoint, handleSaveKey, handleSaveModel, handleSaveLanguage,
    handleSaveTopEntitiesLimit, handleSaveTopTfidfLimit, handleSaveBridgesLimit, generateReport,
    copyToClipboard, downloadMarkdown,
  };
}
