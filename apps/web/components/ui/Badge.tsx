'use client';
import { EntityType } from '@/types/entities';

interface BadgeProps {
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info' | 'entity';
  size?: 'sm' | 'md';
  entityType?: EntityType;
  children: React.ReactNode;
  className?: string;
}

const vStyles: Record<string, React.CSSProperties> = {
  default: { color: 'var(--color-text)', border: '1px solid var(--color-border)' },
  success: { color: 'var(--color-success)', border: '1px solid var(--color-success)' },
  error: { color: 'var(--color-error)', border: '1px solid var(--color-error)' },
  warning: { color: 'var(--color-warning)', border: '1px solid var(--color-warning)' },
  info: { color: 'var(--color-info)', border: '1px solid var(--color-info)' }
};

const sStyles = {
  sm: { fontSize: 11, padding: '2px 8px' },
  md: { fontSize: 12, padding: '3px 10px' }
};

export default function Badge({ variant = 'default', size = 'md', entityType, children, className }: BadgeProps) {
  return (
    <span
      className={entityType ? `badge-${entityType}` : className}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-body)', fontWeight: 500,
        letterSpacing: '0.02em', border: '1px solid transparent', lineHeight: 1.4, background: 'var(--color-surface)',
        borderRadius: 'var(--radius-sm)',
        ...(entityType ? {} : vStyles[variant]),
        ...sStyles[size]
      }}
    >
      {children}
    </span>
  );
}
