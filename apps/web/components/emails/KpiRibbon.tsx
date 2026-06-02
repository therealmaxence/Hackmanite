'use client';

import { EmailStats } from './types';

interface KpiRibbonProps {
  stats: EmailStats;
}

const KPI_CONFIG = [
  { key: 'totalEmails' as const,      label: 'Total Emails',           color: 'var(--color-primary)' },
  { key: 'totalThreads' as const,     label: 'Conversation Threads',   color: 'var(--color-secondary)' },
  { key: 'totalSenders' as const,     label: 'Unique Senders',         color: 'var(--color-secondary-hover)' },
  { key: 'totalRecipients' as const,  label: 'Unique Recipients',      color: 'var(--color-info)' },
  { key: 'totalAttachments' as const, label: 'Total Attachments',      color: 'var(--color-warning)' },
];

export default function KpiRibbon({ stats }: KpiRibbonProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '1rem',
        padding: '1rem clamp(0.75rem, 3vw, 1.5rem)',
        background: 'var(--bg-base)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      {KPI_CONFIG.map((kpi) => (
        <div
          key={kpi.key}
          style={{
            padding: '0.875rem 1.125rem',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.2s ease-in-out',
            cursor: 'default',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = kpi.color;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border)';
          }}
        >
          <div>
            <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
              {kpi.label}
            </p>
            <h4 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-mono, monospace)', margin: 0 }}>
              {stats[kpi.key]}
            </h4>
          </div>
        </div>
      ))}
    </div>
  );
}
