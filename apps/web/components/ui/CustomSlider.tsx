'use client';

import React from 'react';

interface CustomSliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (val: number) => void;
  label: string;
  unit?: string;
  description?: string;
  isLog?: boolean;
}

export default function CustomSlider({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  unit = '',
  description,
  isLog = false,
}: CustomSliderProps) {
  // Mapping value to position and vice-versa if isLog is true
  const valToPos = (val: number) => {
    if (val <= 0) return 0;
    const logVal = Math.log10(Math.max(val, 0.1));
    return (logVal + 1) * 20; // Maps [-1, 5] to [0, 120]
  };

  const posToVal = (pos: number) => {
    if (pos <= 0) return 0;
    const logVal = pos / 20 - 1;
    const raw = Math.pow(10, logVal);
    if (raw >= 10000) return Math.round(raw / 1000) * 1000;
    if (raw >= 1000) return Math.round(raw / 100) * 100;
    if (raw >= 100) return Math.round(raw / 10) * 10;
    if (raw >= 10) return Math.round(raw);
    return Math.round(raw * 10) / 10;
  };

  // Convert value to percentage [0, 100]
  const currentPos = isLog ? valToPos(value) : value;
  const currentMin = isLog ? 0 : min;
  const currentMax = isLog ? 120 : max;
  const pct = ((currentPos - currentMin) / (currentMax - currentMin)) * 100;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = parseFloat(e.target.value);
    if (isLog) {
      onChange(posToVal(rawVal));
    } else {
      onChange(rawVal);
    }
  };

  const decrement = () => {
    if (isLog) {
      const currentPos = valToPos(value);
      if (currentPos > 0) {
        onChange(posToVal(currentPos - 1));
      }
    } else {
      let newVal = value - step;
      if (newVal >= min) {
        const decimals = (step.toString().split('.')[1] || '').length;
        onChange(parseFloat(newVal.toFixed(decimals)));
      }
    }
  };

  const increment = () => {
    if (isLog) {
      const currentPos = valToPos(value);
      if (currentPos < 120) {
        onChange(posToVal(currentPos + 1));
      }
    } else {
      let newVal = value + step;
      if (newVal <= max) {
        const decimals = (step.toString().split('.')[1] || '').length;
        onChange(parseFloat(newVal.toFixed(decimals)));
      }
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.04)',
        borderRadius: '12px',
        padding: '1.5rem',
        width: '100%',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
        position: 'relative',
      }}
    >
      {/* Slider Styles Injection */}
      <style jsx global>{`
        .range-slider-input::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #e2e8f0; /* Light grey thumb */
          border: 2px solid #ffffff;
          box-shadow: 0 0 8px rgba(236, 72, 153, 0.5); /* pink glow */
          cursor: pointer;
          transition: transform 0.1s ease, box-shadow 0.15s ease;
        }
        .range-slider-input::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 0 12px rgba(236, 72, 153, 0.8), 0 0 0 4px rgba(236, 72, 153, 0.15);
        }
        .range-slider-input::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #e2e8f0; /* Light grey thumb */
          border: 2px solid #ffffff;
          box-shadow: 0 0 8px rgba(236, 72, 153, 0.5); /* pink glow */
          cursor: pointer;
          transition: transform 0.1s ease, box-shadow 0.15s ease;
        }
        .range-slider-input::-moz-range-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 0 12px rgba(236, 72, 153, 0.8), 0 0 0 4px rgba(236, 72, 153, 0.15);
        }
      `}</style>

      {/* Header Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span
          style={{
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: 'var(--color-text)',
            letterSpacing: '0.01em',
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.875rem',
            fontWeight: 700,
            color: '#ec4899', /* Accent pink */
            textShadow: '0 0 8px rgba(236, 72, 153, 0.2)',
          }}
        >
          {value.toLocaleString()}
          {unit && <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginLeft: '2px' }}>{unit}</span>}
        </span>
      </div>

      {/* Control Area: Steppers & Slider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Decrement Button */}
        <button
          onClick={decrement}
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'var(--color-text-muted)',
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text)'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
        >
          -
        </button>

        {/* Custom Range Slider */}
        <input
          type="range"
          min={isLog ? 0 : min}
          max={isLog ? 120 : max}
          step={isLog ? 1 : step}
          value={isLog ? valToPos(value) : value}
          onChange={handleSliderChange}
          className="range-slider-input"
          style={{
            flex: 1,
            WebkitAppearance: 'none',
            appearance: 'none',
            height: '6px',
            borderRadius: '3px',
            outline: 'none',
            // Light grey track (right of thumb) and purple-pink gradient track (left of thumb)
            background: `linear-gradient(to right, #8b5cf6 0%, #ec4899 ${pct}%, rgba(255, 255, 255, 0.1) ${pct}%)`,
            cursor: 'pointer',
            transition: 'background 0.05s ease',
          }}
        />

        {/* Increment Button */}
        <button
          onClick={increment}
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'var(--color-text-muted)',
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text)'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
        >
          +
        </button>
      </div>

      {/* Description */}
      {description && (
        <span
          style={{
            fontSize: '0.7rem',
            color: 'var(--color-text-muted)',
            lineHeight: 1.35,
          }}
        >
          {description}
        </span>
      )}
    </div>
  );
}
