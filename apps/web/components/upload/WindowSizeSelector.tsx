'use client';
import { useMemo } from 'react';
import { useTranslation } from '@/lib/i18n';

const SAMPLE_TEXT = "Alice Smith, a lead developer at Google, initiated a collaboration on security protocols. The research group focused on zero-trust architectures for large-scale enterprise deployments. Over the following weeks, the team ran simulations across multiple server regions. Subsequently, Bob Jones, a principal architect at Microsoft, joined the project to align cross-platform standards. Finally, Charlie Brown at Amazon certified the system compliance, completing the multi-cloud secure framework. Developers from all three organizations validated the end-to-end telemetry and logging layers. This unified telemetry ensures that anomalous access patterns are detected and mitigated within milliseconds, establishing a new benchmark for federated identity environments.";

export default function WindowSizeSelector({ windowSize, setWindowSize }: { windowSize: number; setWindowSize: (size: number) => void }) {
  const { t } = useTranslation();
  const highlightedText = useMemo(() => SAMPLE_TEXT.slice(0, windowSize), [windowSize]);
  const dimmedText = useMemo(() => SAMPLE_TEXT.slice(windowSize), [windowSize]);
  const pct = ((windowSize - 50) / 550) * 100;

  const btnStyle = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--color-text-muted)', width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s ease' } as const;
  const hoverBtn = (e: React.MouseEvent<HTMLButtonElement>, enter: boolean) => {
    e.currentTarget.style.color = enter ? 'var(--color-text)' : 'var(--color-text-muted)';
    e.currentTarget.style.background = enter ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)';
  };

  return (
    <div className="window-size-config signature-card" style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: '12px', padding: '2rem', boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)', position: 'relative' }}>
      <style jsx global>{`
        .range-slider-input::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #e2e8f0; border: 2px solid #ffffff; box-shadow: 0 0 8px rgba(236, 72, 153, 0.5); cursor: pointer; transition: transform 0.1s ease, box-shadow 0.15s ease; }
        .range-slider-input::-webkit-slider-thumb:hover { transform: scale(1.2); box-shadow: 0 0 12px rgba(236, 72, 153, 0.8), 0 0 0 4px rgba(236, 72, 153, 0.15); }
        .range-slider-input::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; background: #e2e8f0; border: 2px solid #ffffff; box-shadow: 0 0 8px rgba(236, 72, 153, 0.5); cursor: pointer; transition: transform 0.1s ease, box-shadow 0.15s ease; }
        .range-slider-input::-moz-range-thumb:hover { transform: scale(1.2); box-shadow: 0 0 12px rgba(236, 72, 153, 0.8), 0 0 0 4px rgba(236, 72, 153, 0.15); }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text)' }}>{t('window.title')}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{t('window.subtitle')}</span>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 700, color: '#ec4899', textShadow: '0 0 10px rgba(236, 72, 153, 0.2)' }}>
          {t('window.chars', { count: windowSize })}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button onClick={() => windowSize >= 60 && setWindowSize(windowSize - 10)} style={btnStyle} onMouseEnter={(e) => hoverBtn(e, true)} onMouseLeave={(e) => hoverBtn(e, false)}>-</button>
        <input
          id="window-size-slider"
          type="range"
          min="50"
          max="600"
          step="10"
          value={windowSize}
          onChange={(e) => setWindowSize(parseInt(e.target.value, 10))}
          className="range-slider-input"
          style={{ flex: 1, WebkitAppearance: 'none', appearance: 'none', height: '6px', borderRadius: '3px', outline: 'none', background: `linear-gradient(to right, #8b5cf6 0%, #ec4899 ${pct}%, rgba(255, 255, 255, 0.1) ${pct}%)`, cursor: 'pointer', transition: 'background 0.05s ease' }}
        />
        <button onClick={() => windowSize <= 590 && setWindowSize(windowSize + 10)} style={btnStyle} onMouseEnter={(e) => hoverBtn(e, true)} onMouseLeave={(e) => hoverBtn(e, false)}>+</button>
      </div>

      <div style={{ background: '#09030b', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: 'var(--radius)', padding: '1rem', marginTop: '0.5rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, fontSize: '0.55rem', textTransform: 'uppercase', color: '#ec4899', background: 'rgba(236, 72, 153, 0.1)', padding: '2px 6px', borderRadius: '0 0 0 var(--radius-sm)', fontWeight: 600, letterSpacing: '0.05em' }}>
          {t('window.preview')}
        </div>
        <p style={{ lineHeight: 1.6, fontSize: '0.78rem', letterSpacing: '0.01em', margin: 0, color: 'var(--color-text-muted)' }}>
          <span style={{ background: 'rgba(255, 255, 255, 0.02)', color: 'var(--color-text)', borderBottom: '2px solid #ec4899', transition: 'all 0.12s ease', borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0', padding: '1px 0' }}>
            {highlightedText}
          </span>
          <span style={{ color: 'var(--color-text-muted)', opacity: 0.3, transition: 'all 0.12s ease' }}>{dimmedText}</span>
        </p>
      </div>

      <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', lineHeight: 1.45 }}>{t('window.note')}</span>
    </div>
  );
}
