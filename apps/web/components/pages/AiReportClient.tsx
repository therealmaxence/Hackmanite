'use client';

import React from 'react';
import Header from '@/components/layout/Header';
import { useTranslation } from '@/lib/i18n';
import { useAiReport } from '@/hooks/useAiReport';
import ApiSetupCard from '@/components/ai/ApiSetupCard';
import AnalysisScopeCard from '@/components/ai/AnalysisScopeCard';
import WeakSignalsSelectorCard from '@/components/ai/WeakSignalsSelectorCard';
import ReportDisplayPanel from '@/components/ai/ReportDisplayPanel';

export default function AiReportClient() {
  const { t } = useTranslation();
  const {
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
  } = useAiReport();

  return (
    <div className="min-h-screen bg-base flex flex-col">
      <Header />
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          body { background: #ffffff !important; color: #000000 !important; }
          .no-print, header, nav, button { display: none !important; }
          .print-report { background: transparent !important; padding: 0 !important; border: none !important; }
          .print-report * { color: #000000 !important; }
        }
      `,
        }}
      />

      <main
        className="flex-1 overflow-y-auto custom-scrollbar"
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
      >
        <div
          className="w-full flex flex-col"
          style={{
            gap: '3.5rem',
            padding: '4rem 2rem 6rem 2rem',
            maxWidth: '1280px',
            width: '100%',
            margin: '0 auto',
          }}
        >
          <header className="space-y-4 no-print">
            <h1 className="text-4xl md:text-5xl font-display font-bold text-white leading-tight">
              {t('ai.kicker')}
            </h1>
          </header>

          {!sessionId ? (
            <div className="h-[300px] signature-card flex flex-col items-center justify-center gap-4 border border-dashed border-white/5">
              <p className="text-sm font-mono text-white/30 uppercase tracking-wider">
                {t('ai.no_active_session')}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-12">
              <div className="flex flex-col no-print" style={{ gap: '2.5rem' }}>
                <ApiSetupCard
                  apiKey={apiKey}
                  showKey={showKey}
                  setShowKey={setShowKey}
                  model={model}
                  onSaveKey={handleSaveKey}
                  onSaveModel={handleSaveModel}
                  isOpen={showApiSetup}
                  onToggle={() => setShowApiSetup(!showApiSetup)}
                />

                <AnalysisScopeCard
                  focusType={focusType}
                  setFocusType={setFocusType}
                  language={language}
                  onSaveLanguage={handleSaveLanguage}
                  topEntitiesLimit={topEntitiesLimit}
                  onSaveTopEntitiesLimit={handleSaveTopEntitiesLimit}
                  topTfidfLimit={topTfidfLimit}
                  onSaveTopTfidfLimit={handleSaveTopTfidfLimit}
                  bridgesLimit={bridgesLimit}
                  onSaveBridgesLimit={handleSaveBridgesLimit}
                  customInstructions={customInstructions}
                  setCustomInstructions={setCustomInstructions}
                  estimatedTokens={estimatedTokens}
                  promptPreview={promptPreview}
                  showPreview={showPreview}
                  setShowPreview={setShowPreview}
                  isGenerating={isGenerating}
                  onRunAnalysis={generateReport}
                  isOpen={showAnalysisScope}
                  onToggle={() => setShowAnalysisScope(!showAnalysisScope)}
                />

                <WeakSignalsSelectorCard
                  selectedWeakSignals={selectedWeakSignals}
                  onToggleWeakSignal={handleToggleWeakSignal}
                  weakSignalsData={weakSignalsData}
                  isOpen={showWeakSignalsSelector}
                  onToggle={() => setShowWeakSignalsSelector(!showWeakSignalsSelector)}
                />
              </div>

              <ReportDisplayPanel
                isGenerating={isGenerating}
                statusMsg={statusMsg}
                error={error}
                report={report}
                copied={copied}
                onCopy={copyToClipboard}
                onDownload={downloadMarkdown}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
