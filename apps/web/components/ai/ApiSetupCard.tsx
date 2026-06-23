'use client';
import { useTranslation } from '@/lib/i18n';

interface Props {
  apiProvider: string; onSaveProvider: (provider: string) => void; apiEndpoint: string; onSaveEndpoint: (endpoint: string) => void;
  apiKey: string; showKey: boolean; setShowKey: (val: boolean) => void; model: string; onSaveKey: (key: string) => void;
  onSaveModel: (model: string) => void; isOpen: boolean; onToggle: () => void;
}

export default function ApiSetupCard({
  apiProvider, onSaveProvider, apiEndpoint, onSaveEndpoint, apiKey, showKey, setShowKey,
  model, onSaveKey, onSaveModel, isOpen, onToggle
}: Props) {
  const { t } = useTranslation();

  const selectWrapper = (label: string, value: string, onChange: (val: string) => void, options: Array<{ val: string; labelKey: string }>) => (
    <div className="flex flex-col gap-2.5">
      {label && <label className="text-[11px] text-white/40 font-mono font-medium">{label}</label>}
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
      <button
        type="button"
        onClick={onToggle}
        className="flex justify-between items-center w-full cursor-pointer hover:bg-white/5 transition-colors"
        style={{ padding: '1.5rem 2rem', background: 'none', border: 'none', outline: 'none' }}
      >
        <h3 className="text-sm font-mono uppercase text-white/50 font-semibold tracking-wider">{t('ai.api_setup')}</h3>
        <svg className="w-4 h-4 text-white/40 transition-transform duration-300" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div className="flex flex-col border-t border-white/5" style={{ padding: '1.5rem 2rem 2rem', gap: '2rem' }}>
          {selectWrapper(t('ai.api_provider'), apiProvider, onSaveProvider, [
            { val: 'mistral', labelKey: 'ai.provider.mistral' },
            { val: 'custom', labelKey: 'ai.provider.custom' }
          ])}

          {apiProvider === 'custom' && (
            <div className="flex flex-col gap-2.5">
              <label className="text-[11px] text-white/40 font-mono font-medium">{t('ai.api_endpoint')}</label>
              <input type="text" value={apiEndpoint} onChange={(e) => onSaveEndpoint(e.target.value)} placeholder={t('ai.api_endpoint_placeholder')} className="signature-input w-full font-mono text-xs" style={{ padding: '0.75rem 1.25rem' }} />
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            <label className="text-[11px] text-white/40 font-mono font-medium">{t('ai.api_key')}</label>
            <div className="relative">
              <input type={showKey ? 'text' : 'password'} value={apiKey} onChange={(e) => onSaveKey(e.target.value)} placeholder={`${t('ai.api_key')}...`} className="signature-input w-full font-mono text-xs" style={{ padding: '0.75rem 1.25rem', paddingRight: '4.5rem' }} />
              <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 text-xs font-mono transition-colors">{showKey ? t('ai.hide') : t('ai.show')}</button>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <label className="text-[11px] text-white/40 font-mono font-medium">{t('ai.model')}</label>
            {apiProvider === 'mistral' ? (
              selectWrapper('', model, onSaveModel, [
                { val: 'mistral-large-latest', labelKey: 'ai.model.large' },
                { val: 'mistral-small-latest', labelKey: 'ai.model.small' },
                { val: 'open-mixtral-8x22b', labelKey: 'ai.model.mixtral' }
              ])
            ) : (
              <input type="text" value={model} onChange={(e) => onSaveModel(e.target.value)} placeholder={t('ai.model_placeholder')} className="signature-input w-full font-mono text-xs" style={{ padding: '0.75rem 1.25rem' }} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
