'use client';
import Header from '@/components/layout/Header';
import NoActiveSessionPanel from '@/components/ui/NoActiveSessionPanel';
import Button from '@/components/ui/Button';
import { useTranslation } from '@/lib/i18n';
import { useAiReport } from '@/hooks/useAiReport';
import ApiSetupCard from '@/components/ai/ApiSetupCard';
import AnalysisScopeCard from '@/components/ai/AnalysisScopeCard';
import WeakSignalsSelectorCard from '@/components/ai/WeakSignalsSelectorCard';
import ReportDisplayPanel from '@/components/ai/ReportDisplayPanel';

export default function AiReportClient() {
  const { t } = useTranslation();
  const r = useAiReport();

  return (
    <div className="min-h-screen bg-base flex flex-col">
      <Header />
      <style dangerouslySetInnerHTML={{ __html: `@media print { body { background: #fff !important; color: #000 !important; } .no-print, header, nav, button { display: none !important; } .print-report { background: transparent !important; padding: 0 !important; border: none !important; } .print-report * { color: #000 !important; } }` }} />
      <main className="flex-1 overflow-y-auto custom-scrollbar" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div className="w-full flex flex-col" style={{ gap: '3.5rem', padding: '4rem 2rem 6rem 2rem', maxWidth: '1280px', width: '100%', margin: '0 auto' }}>
          <header className="space-y-4 no-print"><h1 className="text-4xl md:text-5xl font-display font-bold text-white leading-tight">{t('ai.kicker')}</h1></header>
          {!r.sessionId ? (
            <NoActiveSessionPanel message={t('ai.no_active_session')} />
          ) : (
            <div className="flex flex-col gap-12">
              <div className="flex flex-col no-print" style={{ gap: '2.5rem' }}>
                <ApiSetupCard apiProvider={r.apiProvider} onSaveProvider={r.handleSaveProvider} apiEndpoint={r.apiEndpoint} onSaveEndpoint={r.handleSaveEndpoint} apiKey={r.apiKey} showKey={r.showKey} setShowKey={r.setShowKey} model={r.model} onSaveKey={r.handleSaveKey} onSaveModel={r.handleSaveModel} isOpen={r.showApiSetup} onToggle={() => r.setShowApiSetup(!r.showApiSetup)} />
                <WeakSignalsSelectorCard selectedWeakSignals={r.selectedWeakSignals} onToggleWeakSignal={r.handleToggleWeakSignal} onToggleCategoryWeakSignals={r.handleToggleCategoryWeakSignals} onToggleAllWeakSignals={r.handleToggleAllWeakSignals} weakSignalsData={r.weakSignalsData} isOpen={r.showWeakSignalsSelector} onToggle={() => r.setShowWeakSignalsSelector(!r.showWeakSignalsSelector)} />
                <AnalysisScopeCard focusType={r.focusType} setFocusType={r.setFocusType} language={r.language} onSaveLanguage={r.handleSaveLanguage} topEntitiesLimit={r.topEntitiesLimit} onSaveTopEntitiesLimit={r.handleSaveTopEntitiesLimit} topTfidfLimit={r.topTfidfLimit} onSaveTopTfidfLimit={r.handleSaveTopTfidfLimit} bridgesLimit={r.bridgesLimit} onSaveBridgesLimit={r.handleSaveBridgesLimit} customInstructions={r.customInstructions} setCustomInstructions={r.setCustomInstructions} promptPreview={r.promptPreview} showPreview={r.showPreview} setShowPreview={r.setShowPreview} isOpen={r.showAnalysisScope} onToggle={() => r.setShowAnalysisScope(!r.showAnalysisScope)} />
                <div className="flex flex-col gap-3 pt-2">
                  <Button variant="primary" fullWidth loading={r.isGenerating} onClick={r.generateReport} style={{ minHeight: 48, fontSize: '0.95rem' }}>{r.isGenerating ? t('ai.btn_running') : t('ai.btn_run')}</Button>
                  <div className="flex justify-between items-center text-[10px] font-mono text-white/30 px-1">
                    <span>{t('ai.est_cost')}</span><span className="text-white/60 font-semibold">~{r.estimatedTokens} tokens</span>
                  </div>
                </div>
              </div>
              <ReportDisplayPanel isGenerating={r.isGenerating} statusMsg={r.statusMsg} error={r.error} report={r.report} copied={r.copied} onCopy={r.copyToClipboard} onDownload={r.downloadMarkdown} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
