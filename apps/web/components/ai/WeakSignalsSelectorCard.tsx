'use client';

import React from 'react';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from '@/lib/i18n';
import { WeakSignalItem, SelectedWeakSignal } from '@/hooks/useAiReport';

interface WeakSignalsSelectorCardProps {
  selectedWeakSignals: SelectedWeakSignal[];
  onToggleWeakSignal: (ws: WeakSignalItem, methodology: string) => void;
  onToggleCategoryWeakSignals: (items: WeakSignalItem[], methodology: string, checked: boolean) => void;
  onToggleAllWeakSignals: (checked: boolean) => void;
  weakSignalsData?: {
    bridgeSignals: Array<WeakSignalItem & { totalCount: number; fileCount: number }>;
    nicheSignals: Array<WeakSignalItem & { totalCount: number; fileCount: number }>;
    emergingSignals: Array<WeakSignalItem & { totalCount: number; fileCount: number }>;
  };
  isOpen: boolean;
  onToggle: () => void;
}

export default function WeakSignalsSelectorCard({
  selectedWeakSignals,
  onToggleWeakSignal,
  onToggleCategoryWeakSignals,
  onToggleAllWeakSignals,
  weakSignalsData,
  isOpen,
  onToggle,
}: WeakSignalsSelectorCardProps) {
  const { t } = useTranslation();

  const bridgeSignals = weakSignalsData?.bridgeSignals || [];
  const nicheSignals = weakSignalsData?.nicheSignals || [];
  const emergingSignals = weakSignalsData?.emergingSignals || [];

  const totalAvailableSignals = bridgeSignals.length + nicheSignals.length + emergingSignals.length;

  const isAllBridgesChecked = bridgeSignals.length > 0 && bridgeSignals.every((ws) => selectedWeakSignals.some((x) => x.id === ws.id));
  const isAllNicheChecked = nicheSignals.length > 0 && nicheSignals.every((ws) => selectedWeakSignals.some((x) => x.id === ws.id));
  const isAllEmergingChecked = emergingSignals.length > 0 && emergingSignals.every((ws) => selectedWeakSignals.some((x) => x.id === ws.id));

  return (
    <div className="signature-card flex flex-col no-print" style={{ padding: '0' }}>
      <button
        type="button"
        onClick={onToggle}
        className="flex justify-between items-center w-full cursor-pointer hover:bg-white/5 transition-colors"
        style={{ padding: '1.5rem 2rem', background: 'none', border: 'none', outline: 'none' }}
      >
        <h3 className="text-sm font-mono uppercase text-white/50 font-semibold tracking-wider">
          {t('ai.weak_signals_selection')} ({selectedWeakSignals.length})
        </h3>
        <svg
          className="w-4 h-4 text-white/40 transition-transform duration-300"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div className="flex flex-col border-t border-white/5" style={{ padding: '1.5rem 2rem 2rem', gap: '1.5rem' }}>
          <p className="text-xs text-white/40 leading-relaxed">
            {t('ai.weak_signals_selection_desc')}
          </p>

          {!weakSignalsData ? (
            <div className="flex items-center gap-2 text-white/40 font-mono text-[10px] uppercase">
              <Spinner size={12} /> Loading signals...
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {totalAvailableSignals > 0 && (
                <div className="flex justify-between items-center bg-white/5 px-4 py-2.5 rounded border border-white/5 text-xs no-print">
                  <span className="text-white/50 font-mono">
                    {selectedWeakSignals.length === 0
                      ? t('ai.weak_signals.selected_none')
                      : selectedWeakSignals.length === 1
                      ? t('ai.weak_signals.selected_singular', { count: selectedWeakSignals.length })
                      : t('ai.weak_signals.selected_plural', { count: selectedWeakSignals.length })}
                  </span>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => onToggleAllWeakSignals(true)}
                      className="text-[10px] font-mono uppercase text-white/50 hover:text-white transition-colors"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      {t('ai.select_all')}
                    </button>
                    <span className="text-white/10 select-none">|</span>
                    <button
                      type="button"
                      onClick={() => onToggleAllWeakSignals(false)}
                      className="text-[10px] font-mono uppercase text-white/50 hover:text-white transition-colors"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      {t('ai.deselect_all')}
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Bridges */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center pb-1 border-b border-white/5">
                    <h4 className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                      {t('weak_signals.bridges.title')}
                    </h4>
                    {bridgeSignals.length > 0 && (
                      <label className="flex items-center gap-1.5 text-[10px] text-white/40 cursor-pointer select-none hover:text-white transition-colors">
                        <input
                          type="checkbox"
                          checked={isAllBridgesChecked}
                          onChange={(e) => onToggleCategoryWeakSignals(bridgeSignals, 'Bridge', e.target.checked)}
                          style={{ accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                        />
                        <span className="text-[9px] font-mono uppercase">{t('ai.select_all')}</span>
                      </label>
                    )}
                  </div>
                  <div className="max-h-48 overflow-y-auto pr-1 flex flex-col gap-1.5 custom-scrollbar">
                    {bridgeSignals.length === 0 ? (
                      <span className="text-[10px] text-white/20 italic">No signals</span>
                    ) : (
                      bridgeSignals.map((ws) => {
                        const isChecked = selectedWeakSignals.some((x) => x.id === ws.id);
                        return (
                          <label
                            key={ws.id}
                            className="flex items-start gap-2.5 text-[11px] text-white/70 cursor-pointer select-none hover:text-white transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => onToggleWeakSignal(ws, 'Bridge')}
                              style={{ accentColor: 'var(--color-primary)', cursor: 'pointer', marginTop: 2 }}
                            />
                            <span>
                              {ws.label}{' '}
                              <span className="text-[9px] text-white/30 font-mono">
                                ({ws.score.toFixed(2)})
                              </span>
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Niche Topics */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center pb-1 border-b border-white/5">
                    <h4 className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                      {t('weak_signals.niche.title')}
                    </h4>
                    {nicheSignals.length > 0 && (
                      <label className="flex items-center gap-1.5 text-[10px] text-white/40 cursor-pointer select-none hover:text-white transition-colors">
                        <input
                          type="checkbox"
                          checked={isAllNicheChecked}
                          onChange={(e) => onToggleCategoryWeakSignals(nicheSignals, 'Niche', e.target.checked)}
                          style={{ accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                        />
                        <span className="text-[9px] font-mono uppercase">{t('ai.select_all')}</span>
                      </label>
                    )}
                  </div>
                  <div className="max-h-48 overflow-y-auto pr-1 flex flex-col gap-1.5 custom-scrollbar">
                    {nicheSignals.length === 0 ? (
                      <span className="text-[10px] text-white/20 italic">No signals</span>
                    ) : (
                      nicheSignals.map((ws) => {
                        const isChecked = selectedWeakSignals.some((x) => x.id === ws.id);
                        return (
                          <label
                            key={ws.id}
                            className="flex items-start gap-2.5 text-[11px] text-white/70 cursor-pointer select-none hover:text-white transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => onToggleWeakSignal(ws, 'Niche')}
                              style={{ accentColor: 'var(--color-primary)', cursor: 'pointer', marginTop: 2 }}
                            />
                            <span>
                              {ws.label}{' '}
                              <span className="text-[9px] text-white/30 font-mono">
                                ({ws.score.toFixed(1)})
                              </span>
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Emerging Signals */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center pb-1 border-b border-white/5">
                    <h4 className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                      {t('weak_signals.emerging.title')}
                    </h4>
                    {emergingSignals.length > 0 && (
                      <label className="flex items-center gap-1.5 text-[10px] text-white/40 cursor-pointer select-none hover:text-white transition-colors">
                        <input
                          type="checkbox"
                          checked={isAllEmergingChecked}
                          onChange={(e) => onToggleCategoryWeakSignals(emergingSignals, 'Emerging', e.target.checked)}
                          style={{ accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                        />
                        <span className="text-[9px] font-mono uppercase">{t('ai.select_all')}</span>
                      </label>
                    )}
                  </div>
                  <div className="max-h-48 overflow-y-auto pr-1 flex flex-col gap-1.5 custom-scrollbar">
                    {emergingSignals.length === 0 ? (
                      <span className="text-[10px] text-white/20 italic">No signals</span>
                    ) : (
                      emergingSignals.map((ws) => {
                        const isChecked = selectedWeakSignals.some((x) => x.id === ws.id);
                        return (
                          <label
                            key={ws.id}
                            className="flex items-start gap-2.5 text-[11px] text-white/70 cursor-pointer select-none hover:text-white transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => onToggleWeakSignal(ws, 'Emerging')}
                              style={{ accentColor: 'var(--color-primary)', cursor: 'pointer', marginTop: 2 }}
                            />
                            <span>
                              {ws.label}{' '}
                              <span className="text-[9px] text-white/30 font-mono">
                                ({ws.score.toFixed(1)})
                              </span>
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
