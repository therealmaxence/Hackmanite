'use client';
import CustomSlider from '@/components/ui/CustomSlider';
import InfoHint from '@/components/ui/InfoHint';
import { useTranslation } from '@/lib/i18n';

interface Props {
  focusType: string; setFocusType: (val: string) => void; language: string; onSaveLanguage: (val: string) => void;
  topEntitiesLimit: number; onSaveTopEntitiesLimit: (val: number) => void; topTfidfLimit: number; onSaveTopTfidfLimit: (val: number) => void;
  bridgesLimit: number; onSaveBridgesLimit: (val: number) => void; customInstructions: string; setCustomInstructions: (val: string) => void;
  promptPreview: string; showPreview: boolean; setShowPreview: (val: boolean) => void; isOpen: boolean; onToggle: () => void;
}

export default function AnalysisScopeCard({
  focusType, setFocusType, language, onSaveLanguage, topEntitiesLimit, onSaveTopEntitiesLimit,
  topTfidfLimit, onSaveTopTfidfLimit, bridgesLimit, onSaveBridgesLimit, customInstructions,
  setCustomInstructions, promptPreview, showPreview, setShowPreview, isOpen, onToggle
}: Props) {
  const { t } = useTranslation();

  const fieldLabel = (label: string, help?: string) => (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-[11px] text-white/40 font-mono font-medium">{label}</span>
      {help && <InfoHint title={label} body={help} placement="top" align="left" panelWidth={270} />}
    </div>
  );

  const selectWrapper = (label: string, value: string, onChange: (val: string) => void, options: Array<{ val: string; labelKey: string }>, help?: string) => (
    <div className="flex flex-col gap-2.5">
      {fieldLabel(label, help)}
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="signature-input w-full appearance-none text-xs cursor-pointer bg-surface-input text-white border-none"
          style={{ padding: '0.75rem 1.25rem', paddingRight: '2.5rem' }}
        >
          {options.map((opt) => <option key={opt.val} value={opt.val}>{t(opt.labelKey)}</option>)}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="m6 9 6 6 6-6" />
          </svg>
        </div>
      </div>
    </div>
  );

  return (
    <div className="signature-card flex flex-col" style={{ padding: '0' }}>
      <div
        className="flex justify-between items-center w-full hover:bg-white/5 transition-colors"
        style={{ padding: '1.5rem 2rem', background: 'none', border: 'none', outline: 'none' }}
      >
        <span className="flex items-center gap-2">
          <button type="button" onClick={onToggle} className="cursor-pointer" style={{ background: 'none', border: 'none', padding: 0, outline: 'none' }}>
            <span className="text-sm font-mono uppercase text-white/50 font-semibold tracking-wider">{t('ai.analysis_scope')}</span>
          </button>
          <InfoHint title={t('ai.analysis_scope')} body={t('ai.analysis_scope_help')} placement="bottom" align="left" panelWidth={300} />
        </span>
        <button type="button" onClick={onToggle} aria-label={t('ai.analysis_scope')} className="cursor-pointer" style={{ background: 'none', border: 'none', padding: 0, outline: 'none' }}>
          <svg className="w-4 h-4 text-white/40 transition-transform duration-300" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="flex flex-col border-t border-white/5" style={{ padding: '1.5rem 2rem 2rem', gap: '2rem' }}>
          {selectWrapper(t('ai.focus_mode'), focusType, setFocusType, [
            { val: 'general', labelKey: 'ai.focus.general' },
            { val: 'actors', labelKey: 'ai.focus.actors' },
            { val: 'networks', labelKey: 'ai.focus.networks' },
            { val: 'timeline', labelKey: 'ai.focus.timeline' }
          ], t('ai.focus_mode_help'))}
          {selectWrapper(t('ai.output_lang'), language, onSaveLanguage, [
            { val: 'en', labelKey: 'language.en' },
            { val: 'fr', labelKey: 'language.fr' }
          ], t('ai.output_lang_help'))}

          <CustomSlider label={t('ai.top_entities')} value={topEntitiesLimit} min={10} max={100} step={5} onChange={onSaveTopEntitiesLimit} unit=" nodes" help={t('ai.top_entities_help')} />
          <CustomSlider label={t('ai.top_tfidf')} value={topTfidfLimit} min={10} max={100} step={5} onChange={onSaveTopTfidfLimit} unit=" nodes" help={t('ai.top_tfidf_help')} />
          <CustomSlider label={t('ai.bridges')} value={bridgesLimit} min={5} max={30} step={1} onChange={onSaveBridgesLimit} unit=" nodes" help={t('ai.bridges_help')} />

          <div className="flex flex-col gap-2.5">
            {fieldLabel(t('ai.custom_directives'), t('ai.custom_directives_help'))}
            <textarea
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder={t('ai.custom_directives_placeholder')}
              rows={4}
              className="signature-input w-full text-xs resize-none"
              style={{ padding: '0.75rem 1.25rem' }}
            />
          </div>

          <div className="flex flex-col gap-2.5 border-t border-white/5 pt-4 mt-2">
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="text-xs font-mono text-white/40 hover:text-white/70 transition-colors flex justify-between items-center cursor-pointer"
              style={{ background: 'none', border: 'none', padding: 0, outline: 'none' }}
            >
              <span>{showPreview ? t('ai.hide_preview') : t('ai.show_preview')}</span>
              <span>{showPreview ? '▲' : '▼'}</span>
            </button>
            {showPreview && (
              <pre className="signature-input font-mono text-[9px] text-white/50 bg-surface-input p-3 rounded overflow-x-auto max-h-48 max-w-full whitespace-pre-wrap select-all leading-relaxed" style={{ width: '100%' }}>
                {promptPreview || t('ai.generating_preview')}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
