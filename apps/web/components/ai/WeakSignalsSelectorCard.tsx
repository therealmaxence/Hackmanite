'use client';

import React from 'react';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from '@/lib/i18n';
import { WeakSignalItem, SelectedWeakSignal } from '@/hooks/useAiReport';

interface WeakSignalsSelectorCardProps {
  selectedWeakSignals: SelectedWeakSignal[];
  onToggleWeakSignal: (ws: WeakSignalItem, methodology: string) => void;
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
  weakSignalsData,
  isOpen,
  onToggle,
}: WeakSignalsSelectorCardProps) {
  const { t } = useTranslation();

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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Bridges */}
              <div className="flex flex-col gap-2">
                <h4 className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                  {t('weak_signals.bridges.title')}
                </h4>
                <div className="max-h-48 overflow-y-auto pr-1 flex flex-col gap-1.5 custom-scrollbar">
                  {weakSignalsData.bridgeSignals?.length === 0 ? (
                    <span className="text-[10px] text-white/20 italic">No signals</span>
                  ) : (
                    weakSignalsData.bridgeSignals?.map((ws) => {
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
                <h4 className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                  {t('weak_signals.niche.title')}
                </h4>
                <div className="max-h-48 overflow-y-auto pr-1 flex flex-col gap-1.5 custom-scrollbar">
                  {weakSignalsData.nicheSignals?.length === 0 ? (
                    <span className="text-[10px] text-white/20 italic">No signals</span>
                  ) : (
                    weakSignalsData.nicheSignals?.map((ws) => {
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
                <h4 className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                  {t('weak_signals.emerging.title')}
                </h4>
                <div className="max-h-48 overflow-y-auto pr-1 flex flex-col gap-1.5 custom-scrollbar">
                  {weakSignalsData.emergingSignals?.length === 0 ? (
                    <span className="text-[10px] text-white/20 italic">No signals</span>
                  ) : (
                    weakSignalsData.emergingSignals?.map((ws) => {
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
          )}
        </div>
      )}
    </div>
  );
}
