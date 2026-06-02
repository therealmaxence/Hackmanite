'use client';

import React from 'react';
import { EntityType } from '@/types/entities';

type BadgeVariant = 'default' | 'success' | 'error' | 'warning' | 'info' | 'entity';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  entityType?: EntityType;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  default: {
    background: 'var(--color-surface)',
    color: 'var(--color-text)',
    border: '1px solid var(--color-border)',
  },
  success: {
    background: 'var(--color-surface)',
    color: 'var(--color-success)',
    border: '1px solid var(--color-success)',
  },
  error: {
    background: 'var(--color-surface)',
    color: 'var(--color-error)',
    border: '1px solid var(--color-error)',
  },
  warning: {
    background: 'var(--color-surface)',
    color: 'var(--color-warning)',
    border: '1px solid var(--color-warning)',
  },
  info: {
    background: 'var(--color-surface)',
    color: 'var(--color-info)',
    border: '1px solid var(--color-info)',
  },
  entity: {}, // set dynamically via className
};

const sizeStyles: Record<BadgeSize, React.CSSProperties> = {
  sm: { fontSize: '11px', padding: '2px 8px', borderRadius: 'var(--radius-sm)' },
  md: { fontSize: '12px', padding: '3px 10px', borderRadius: 'var(--radius-sm)' },
};

export default function Badge({
  variant = 'default',
  size = 'md',
  entityType,
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={entityType ? `badge-${entityType}` : className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontFamily: 'var(--font-body)',
        fontWeight: 500,
        letterSpacing: '0.02em',
        border: '1px solid transparent',
        lineHeight: 1.4,
        ...(entityType ? {} : variantStyles[variant]),
        ...sizeStyles[size],
      }}
    >
      {children}
    </span>
  );
}
