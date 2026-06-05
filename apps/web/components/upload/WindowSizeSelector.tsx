'use client';

import { useMemo } from 'react';

const SAMPLE_TEXT =
  "Alice Smith, a lead developer at Google, initiated a collaboration on security protocols. " +
  "The research group focused on zero-trust architectures for large-scale enterprise deployments. " +
  "Over the following weeks, the team ran simulations across multiple server regions. " +
  "Subsequently, Bob Jones, a principal architect at Microsoft, joined the project to align cross-platform standards. " +
  "Finally, Charlie Brown at Amazon certified the system compliance, completing the multi-cloud secure framework.";

interface WindowSizeSelectorProps {
  windowSize: number;
  setWindowSize: (size: number) => void;
}

export default function WindowSizeSelector({ windowSize, setWindowSize }: WindowSizeSelectorProps) {
  const highlightedText = useMemo(() => SAMPLE_TEXT.slice(0, windowSize), [windowSize]);
  const dimmedText = useMemo(() => SAMPLE_TEXT.slice(windowSize), [windowSize]);

  return (
    <div
      className="window-size-config signature-card"
      style={{
        marginBottom: '2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        background: 'var(--color-surface-raised)',
        border: 'none',
        borderRadius: 'var(--radius)',
        padding: '1.5rem',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      }}
    >
      {/* Slider Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Co-occurrence Window Size
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
            NLP entity pairing proximity threshold
          </span>
        </div>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '1rem',
            fontWeight: 700,
            color: 'var(--color-primary)',
            textShadow: '0 0 10px rgba(123, 47, 190, 0.5)',
          }}
        >
          {windowSize} chars
        </span>
      </div>

      {/* Slider Input */}
      <input
        id="window-size-slider"
        type="range"
        min="50"
        max="600"
        step="10"
        value={windowSize}
        onChange={(e) => setWindowSize(parseInt(e.target.value, 10))}
        style={{
          accentColor: 'var(--color-primary)',
          cursor: 'pointer',
          width: '100%',
          height: '6px',
          borderRadius: 'var(--radius-sm)',
        }}
      />



      {/* Dynamic Snippet Visual Previewer */}
      <div
        style={{
          background: 'var(--color-bg)',
          border: 'none',
          borderRadius: 'var(--radius)',
          padding: '1rem',
          marginTop: '0.5rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            fontSize: '0.55rem',
            textTransform: 'uppercase',
            color: 'var(--color-primary)',
            background: 'var(--color-surface-hover)',
            padding: '2px 6px',
            borderRadius: '0 0 0 var(--radius-sm)',
            fontWeight: 600,
            letterSpacing: '0.05em',
          }}
        >
          Live NLP Preview
        </div>
        
        <p style={{ lineHeight: 1.6, fontSize: '0.78rem', letterSpacing: '0.01em', margin: 0, color: 'var(--color-text-muted)' }}>
          <span
            style={{
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              borderBottom: '2px solid var(--color-primary)',
              transition: 'all 0.12s ease',
              borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
              padding: '1px 0',
            }}
          >
            {highlightedText}
          </span>
          <span
            style={{
              color: 'var(--color-text-muted)',
              opacity: 0.3,
              transition: 'all 0.12s ease',
            }}
          >
            {dimmedText}
          </span>
        </p>
      </div>

      <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', lineHeight: 1.45 }}>
        Entities falling inside the highlighted window are linked in the graph. Increase the size to connect distant entities.
      </span>
    </div>
  );
}
