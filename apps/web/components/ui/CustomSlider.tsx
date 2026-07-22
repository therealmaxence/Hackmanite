'use client';
import React from 'react';
import InfoHint from '@/components/ui/InfoHint';

interface CustomSliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (val: number) => void;
  label: string;
  unit?: string;
  description?: string;
  help?: string;
  isLog?: boolean;
}

export default function CustomSlider({
  value, min, max, step = 1, onChange, label, unit = '', description, help, isLog = false,
}: CustomSliderProps) {
  const valToPos = (val: number) => (val <= 0 ? 0 : (Math.log10(Math.max(val, 0.1)) + 1) * 20);
  const posToVal = (pos: number) => {
    if (pos <= 0) return 0;
    const raw = Math.pow(10, pos / 20 - 1);
    const s = raw >= 10000 ? 1000 : raw >= 1000 ? 100 : raw >= 100 ? 10 : raw >= 10 ? 1 : 0.1;
    return Math.round(raw / s) * s;
  };

  const currentPos = isLog ? valToPos(value) : value;
  const currentMin = isLog ? 0 : min;
  const currentMax = isLog ? 120 : max;
  const pct = ((currentPos - currentMin) / (currentMax - currentMin)) * 100;

  const adjust = (dir: number) => {
    if (isLog) {
      const p = valToPos(value) + dir;
      if (p >= 0 && p <= 120) onChange(posToVal(p));
    } else {
      const newVal = value + dir * step;
      if (newVal >= min && newVal <= max) {
        const dec = (step.toString().split('.')[1] || '').length;
        onChange(parseFloat(newVal.toFixed(dec)));
      }
    }
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: '12px', padding: '1.5rem', width: '100%',
      boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)', position: 'relative',
    }}>
      <style jsx global>{`
        .range-slider-input::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none; width: 14px; height: 14px; border-radius: 50%;
          background: #e2e8f0; border: 2px solid #ffffff; box-shadow: 0 0 8px rgba(236, 72, 153, 0.5);
          cursor: pointer; transition: transform 0.1s ease, box-shadow 0.15s ease;
        }
        .range-slider-input::-webkit-slider-thumb:hover {
          transform: scale(1.2); box-shadow: 0 0 12px rgba(236, 72, 153, 0.8), 0 0 0 4px rgba(236, 72, 153, 0.15);
        }
        .range-slider-input::-moz-range-thumb {
          width: 14px; height: 14px; border-radius: 50%; background: #e2e8f0; border: 2px solid #ffffff;
          box-shadow: 0 0 8px rgba(236, 72, 153, 0.5); cursor: pointer; transition: transform 0.1s ease, box-shadow 0.15s ease;
        }
        .range-slider-input::-moz-range-thumb:hover {
          transform: scale(1.2); box-shadow: 0 0 12px rgba(236, 72, 153, 0.8), 0 0 0 4px rgba(236, 72, 153, 0.15);
        }
        .slider-btn {
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); color: var(--color-text-muted);
          width: 28px; height: 28px; border-radius: 6px; cursor: pointer; font-size: 0.9rem;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.15s ease;
        }
        .slider-btn:hover { color: var(--color-text); background: rgba(255,255,255,0.08); }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text)', letterSpacing: '0.01em' }}>{label}</span>
          {help && <InfoHint title={label} body={help} placement="top" align="left" panelWidth={270} />}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', fontWeight: 700, color: '#ec4899', textShadow: '0 0 8px rgba(236, 72, 153, 0.2)' }}>
          {value.toLocaleString()}
          {unit && <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginLeft: '2px' }}>{unit}</span>}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button onClick={() => adjust(-1)} className="slider-btn">-</button>
        <input
          type="range" min={isLog ? 0 : min} max={isLog ? 120 : max} step={isLog ? 1 : step}
          value={isLog ? valToPos(value) : value}
          onChange={(e) => onChange(isLog ? posToVal(parseFloat(e.target.value)) : parseFloat(e.target.value))}
          className="range-slider-input"
          style={{
            flex: 1, WebkitAppearance: 'none', appearance: 'none', height: '6px', borderRadius: '3px', outline: 'none',
            background: `linear-gradient(to right, #8b5cf6 0%, #ec4899 ${pct}%, rgba(255, 255, 255, 0.1) ${pct}%)`,
            cursor: 'pointer', transition: 'background 0.05s ease',
          }}
        />
        <button onClick={() => adjust(1)} className="slider-btn">+</button>
      </div>

      {description && <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', lineHeight: 1.35 }}>{description}</span>}
    </div>
  );
}
