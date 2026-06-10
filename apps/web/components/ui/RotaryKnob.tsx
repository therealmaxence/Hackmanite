'use client';

import React, { useRef, useState, useEffect } from 'react';

interface RotaryKnobProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (val: number) => void;
  label: string;
  unit?: string;
  description?: string;
}

export default function RotaryKnob({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  unit = '',
  description,
}: RotaryKnobProps) {
  const knobRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const startVal = useRef(0);

  // Convert value to percentage [0, 1]
  const pct = (value - min) / (max - min);

  // Compute rotation angle (min value is -135deg, max value is 135deg)
  const minAngle = -135;
  const maxAngle = 135;
  const angle = minAngle + pct * (maxAngle - minAngle);

  // Handle Drag
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startY.current = e.clientY;
    startVal.current = value;

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    const deltaY = startY.current - e.clientY; // drag up to increase
    // Scale deltaY relative to a 150px drag height for full range
    const range = max - min;
    const dragSensitivity = 150; 
    let newVal = startVal.current + (deltaY / dragSensitivity) * range;

    // Apply step
    newVal = Math.round(newVal / step) * step;
    // Clamp values
    newVal = Math.max(min, Math.min(max, newVal));
    // Round to prevent JS float issues (e.g. 0.300000000004)
    const decimals = (step.toString().split('.')[1] || '').length;
    newVal = parseFloat(newVal.toFixed(decimals));

    onChange(newVal);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // Clean up listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Handle Scroll Wheel
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const direction = e.deltaY < 0 ? 1 : -1;
    let newVal = value + direction * step;
    newVal = Math.max(min, Math.min(max, newVal));
    const decimals = (step.toString().split('.')[1] || '').length;
    newVal = parseFloat(newVal.toFixed(decimals));
    onChange(newVal);
  };

  // Stepper handlers
  const decrement = () => {
    let newVal = value - step;
    if (newVal >= min) {
      const decimals = (step.toString().split('.')[1] || '').length;
      onChange(parseFloat(newVal.toFixed(decimals)));
    }
  };

  const increment = () => {
    let newVal = value + step;
    if (newVal <= max) {
      const decimals = (step.toString().split('.')[1] || '').length;
      onChange(parseFloat(newVal.toFixed(decimals)));
    }
  };

  // Arc math for SVG ring
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  // Arc starts at -135deg and spans 270deg
  const strokeDashoffset = circumference - (pct * 270 / 360) * circumference;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: 'rgba(20, 5, 12, 0.4)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '12px',
        padding: '1.5rem',
        width: '100%',
        minWidth: '150px',
        textAlign: 'center',
        position: 'relative',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        userSelect: 'none',
      }}
    >
      {/* Label */}
      <span
        style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          color: 'var(--color-text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '0.875rem',
          display: 'block',
          height: '2rem',
          overflow: 'hidden',
        }}
      >
        {label}
      </span>

      {/* Interactive Knob Area */}
      <div
        ref={knobRef}
        onMouseDown={handleMouseDown}
        onWheel={handleWheel}
        style={{
          position: 'relative',
          width: '80px',
          height: '80px',
          cursor: isDragging ? 'grabbing' : 'grab',
          marginBottom: '1rem',
        }}
      >
        {/* Glow Ring SVG */}
        <svg
          width="80"
          height="80"
          viewBox="0 0 80 80"
          style={{
            transform: 'rotate(135deg)',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        >
          {/* Base track */}
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.04)"
            strokeWidth="4"
            strokeDasharray={`${(270 / 360) * circumference} ${circumference}`}
            strokeLinecap="round"
          />
          {/* Active value track */}
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              filter: 'drop-shadow(0 0 2px var(--color-primary))',
              transition: isDragging ? 'none' : 'stroke-dashoffset 0.15s ease-out',
            }}
          />
        </svg>

        {/* Circular Inner Dial */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #1c0e15, #080206)',
            boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.05), 0 4px 10px rgba(0,0,0,0.5)',
            border: '2px solid rgba(255, 255, 255, 0.08)',
            transform: `rotate(${angle}deg)`,
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Notch indicator */}
          <div
            style={{
              position: 'absolute',
              top: '4px',
              width: '3px',
              height: '10px',
              background: 'var(--color-primary)',
              borderRadius: '1.5px',
              filter: 'drop-shadow(0 0 1px var(--color-primary))',
            }}
          />
        </div>
      </div>

      {/* Value Stepper */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <button
          onClick={decrement}
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'var(--color-text-muted)',
            width: '26px',
            height: '26px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text)'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
        >
          -
        </button>

        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '1rem',
            fontWeight: 700,
            color: 'var(--color-primary)',
            minWidth: '60px',
            textAlign: 'center',
            textShadow: '0 0 4px rgba(244, 63, 94, 0.2)',
          }}
        >
          {value}
          {unit && <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginLeft: '1px' }}>{unit}</span>}
        </span>

        <button
          onClick={increment}
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'var(--color-text-muted)',
            width: '26px',
            height: '26px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
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
            fontSize: '0.625rem',
            color: 'var(--color-text-muted)',
            lineHeight: 1.3,
            display: 'block',
            marginTop: '0.25rem',
          }}
        >
          {description}
        </span>
      )}
    </div>
  );
}
