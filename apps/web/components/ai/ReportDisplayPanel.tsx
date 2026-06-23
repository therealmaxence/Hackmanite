'use client';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import MarkdownReport from '@/components/ai/MarkdownReport';
import { useTranslation } from '@/lib/i18n';

interface Props {
  isGenerating: boolean; statusMsg: string; error: string | null; report: string; copied: boolean;
  onCopy: () => void; onDownload: () => void;
}

export default function ReportDisplayPanel({ isGenerating, statusMsg, error, report, copied, onCopy, onDownload }: Props) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col print-report" style={{ gap: '1.5rem' }}>
      {isGenerating && (
        <div className="signature-card h-[400px] flex flex-col items-center justify-center gap-4 border border-dashed border-white/5">
          <Spinner size={28} color="var(--color-primary-hover)" />
          <p className="text-xs font-mono text-white/40 uppercase tracking-widest animate-pulse">{t(statusMsg)}</p>
        </div>
      )}
      {error && (
        <div className="signature-card bg-danger/10 border border-error/20 p-8 flex flex-col gap-3">
          <h4 className="text-sm font-semibold text-error font-mono">{t('ai.error.suspended')}</h4>
          <p className="text-xs text-white/50 leading-relaxed">{error}</p>
        </div>
      )}
      {!isGenerating && !error && !report && (
        <div className="signature-card h-[400px] flex flex-col items-center justify-center gap-3 border border-dashed border-white/5 text-center p-10">
          <p className="text-xs font-mono text-white/30 uppercase tracking-widest font-semibold">{t('ai.ready_title')}</p>
          <p className="text-xs text-white/40 max-w-xs leading-relaxed">{t('ai.ready_desc')}</p>
        </div>
      )}
      {!isGenerating && report && (
        <div className="signature-card bg-surface-raised border border-white/5 rounded-lg shadow-2xl print-report flex flex-col" style={{ padding: '2.5rem' }}>
          <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-6 no-print flex-shrink-0">
            <span className="text-xs font-mono uppercase text-white/50 font-semibold tracking-wider">{t('ai.briefing_analysis')}</span>
            <div className="flex gap-2" style={{ transform: 'translateY(-6px)' }}>
              <Button variant="secondary" size="xs" onClick={onCopy}>{copied ? t('ai.btn_copied') : t('ai.btn_copy')}</Button>
              <Button variant="secondary" size="xs" onClick={onDownload}>{t('ai.btn_download_md')}</Button>
              <Button variant="secondary" size="xs" onClick={() => window.print()}>{t('ai.btn_print_pdf')}</Button>
            </div>
          </div>
          <div className="overflow-y-auto custom-scrollbar pr-2"><MarkdownReport report={report} /></div>
        </div>
      )}
    </div>
  );
}
