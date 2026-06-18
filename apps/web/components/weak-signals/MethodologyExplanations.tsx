'use client';

import React, { useState } from 'react';
import { useTranslation } from '@/lib/i18n';

export default function MethodologyExplanations() {
  const { t } = useTranslation();
  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setOpenSection((prev) => (prev === section ? null : section));
  };

  const sections = [
    {
      id: 'a',
      nameKey: 'weak_signals.methodology_a.name',
      formulaKey: 'weak_signals.methodology_a.formula',
      descKey: 'weak_signals.methodology_a.desc',
    },
    {
      id: 'b',
      nameKey: 'weak_signals.methodology_b.name',
      formulaKey: 'weak_signals.methodology_b.formula',
      descKey: 'weak_signals.methodology_b.desc',
    },
    {
      id: 'c',
      nameKey: 'weak_signals.methodology_c.name',
      formulaKey: 'weak_signals.methodology_c.formula',
      descKey: 'weak_signals.methodology_c.desc',
    },
  ];

  return (
    <div className="flex flex-col gap-6" style={{ width: '100%' }}>
      <h2 className="text-xl font-display font-bold text-white/90">
        {t('weak_signals.explanations.title')}
      </h2>

      <div className="flex flex-col gap-4">
        {sections.map((sec) => {
          const isOpen = openSection === sec.id;
          return (
            <div key={sec.id} className="signature-card flex flex-col" style={{ padding: '0' }}>
              <button
                type="button"
                onClick={() => toggleSection(sec.id)}
                className="flex justify-between items-center w-full cursor-pointer hover:bg-white/5 transition-colors"
                style={{ padding: '1.25rem 1.75rem', background: 'none', border: 'none', outline: 'none' }}
              >
                <div className="flex flex-col items-start gap-1">
                  <span className="text-sm font-semibold text-white/90">
                    {t(sec.nameKey)}
                  </span>
                  <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider">
                    {t(sec.formulaKey)}
                  </span>
                </div>
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
                <div className="border-t border-white/5" style={{ padding: '1.5rem 1.75rem' }}>
                  <p className="text-xs text-white/60 leading-relaxed max-w-3xl whitespace-pre-wrap">
                    {t(sec.descKey)}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
