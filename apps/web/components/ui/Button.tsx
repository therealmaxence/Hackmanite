'use client';

import React, { CSSProperties } from 'react';
import Spinner from './Spinner';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, CSSProperties> = {
  primary: {
    background: 'var(--color-primary)',
    color: 'var(--color-on-primary)',
    border: 'none',
  },
  secondary: {
    background: 'var(--color-surface-raised)',
    color: 'var(--color-text)',
    border: 'none',
  },
  ghost: {
    background: 'var(--color-surface)',
    color: 'var(--color-text-muted)',
    border: 'none',
  },
  danger: {
    background: '#2a171d',
    color: 'var(--color-error)',
    border: 'none',
  },
};

const sizeStyles: Record<ButtonSize, CSSProperties> = {
  xs: { minHeight: 32, padding: '0 var(--space-2)', fontSize: '11px', borderRadius: 'var(--radius-sm)' },
  sm: { minHeight: 44, padding: '0 var(--space-3)', fontSize: 'var(--fs-sm)', borderRadius: 'var(--radius-sm)' },
  md: { minHeight: 44, padding: '0 var(--space-4)', fontSize: 'var(--fs-sm)', borderRadius: 'var(--radius)' },
  lg: { minHeight: 44, padding: '0 var(--space-5)', fontSize: 'var(--fs-md)', borderRadius: 'var(--radius)' },
};

export default function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  fullWidth = false,
  leftIcon,
  children,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      disabled={isDisabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        fontFamily: 'var(--font-body)',
        fontWeight: 500,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.5 : 1,
        transition: 'background-color 80ms ease, box-shadow 350ms ease-in, color 300ms ease-in',
        outline: 'none',
        width: fullWidth ? '100%' : undefined,
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...style,
      }}
      onMouseEnter={(e) => {
        if (isDisabled) return;
        const el = e.currentTarget;
        el.style.transition = 'background-color 80ms ease, box-shadow 240ms cubic-bezier(0.22, 1, 0.36, 1), color 180ms ease-out';
        if (variant === 'primary') {
          el.style.background = 'var(--color-primary-hover) var(--noise-bg)';
          el.style.boxShadow = 'var(--glow-leger)';
        }
        if (variant === 'secondary') {
          el.style.background = 'var(--color-surface-hover) var(--noise-bg)';
          el.style.boxShadow = 'var(--glow-trace)';
        }
        if (variant === 'ghost') {
          el.style.color = 'var(--color-primary-hover)';
          el.style.background = 'var(--color-surface-hover) var(--noise-bg)';
        }
        if (variant === 'danger') {
          el.style.background = '#3d1d26 var(--noise-bg)';
        }
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.opacity = isDisabled ? '0.5' : '1';
        el.style.transition = 'background-color 80ms ease, box-shadow 350ms ease-in, color 300ms ease-in';
        el.style.boxShadow = 'none';
        if (variant === 'primary') {
          el.style.background = 'var(--color-primary)';
        }
        if (variant === 'secondary') {
          el.style.background = 'var(--color-surface-raised)';
        }
        if (variant === 'ghost') {
          el.style.color = 'var(--color-text-muted)';
          el.style.background = 'var(--color-surface)';
        }
        if (variant === 'danger') {
          el.style.background = '#2a171d';
        }
      }}
    >
      {loading ? <Spinner size={14} /> : leftIcon}
      {children}
    </button>
  );
}
