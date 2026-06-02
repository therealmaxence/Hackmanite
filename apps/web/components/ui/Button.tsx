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
    border: '1px solid var(--color-primary)',
  },
  secondary: {
    background: 'transparent',
    color: 'var(--color-text)',
    border: '1px solid var(--color-border)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--color-text-muted)',
    border: '1px solid transparent',
  },
  danger: {
    background: 'transparent',
    color: 'var(--color-error)',
    border: '1px solid var(--color-error)',
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
        transition: 'all var(--transition-fast)',
        outline: 'none',
        width: fullWidth ? '100%' : undefined,
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...style,
      }}
      onMouseEnter={(e) => {
        if (isDisabled) return;
        const el = e.currentTarget;
        if (variant === 'primary') {
          el.style.background = 'var(--color-primary-hover)';
          el.style.borderColor = 'var(--color-primary-hover)';
        }
        if (variant === 'secondary') {
          el.style.borderColor = 'var(--color-secondary)';
          el.style.background = 'color-mix(in srgb, var(--color-secondary) 10%, transparent)';
        }
        if (variant === 'ghost') {
          el.style.color = 'var(--color-text)';
          el.style.background = 'color-mix(in srgb, var(--color-secondary) 5%, transparent)';
        }
        if (variant === 'danger') {
          el.style.background = 'color-mix(in srgb, var(--color-error) 10%, transparent)';
        }
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.opacity = isDisabled ? '0.5' : '1';
        if (variant === 'primary') {
          el.style.background = 'var(--color-primary)';
          el.style.borderColor = 'var(--color-primary)';
        }
        if (variant === 'secondary') {
          el.style.borderColor = 'var(--color-border)';
          el.style.background = 'transparent';
        }
        if (variant === 'ghost') {
          el.style.color = 'var(--color-text-muted)';
          el.style.background = 'transparent';
        }
        if (variant === 'danger') {
          el.style.background = 'transparent';
        }
      }}
    >
      {loading ? <Spinner size={14} /> : leftIcon}
      {children}
    </button>
  );
}
