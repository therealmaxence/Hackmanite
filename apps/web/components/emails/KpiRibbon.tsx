'use client';

import { EmailStats } from './types';
import { useTranslation } from '@/lib/i18n';

const KPI_CONFIG = [
  { key: 'totalEmails' as const, labelKey: 'emails.kpi.total_emails' },
  { key: 'totalThreads' as const, labelKey: 'emails.kpi.threads' },
  { key: 'totalSenders' as const, labelKey: 'emails.kpi.senders' },
  { key: 'totalRecipients' as const, labelKey: 'emails.kpi.recipients' },
  { key: 'totalAttachments' as const, labelKey: 'emails.kpi.attachments' },
];

export default function KpiRibbon({ stats }: { stats: EmailStats }) {
  const { t } = useTranslation();
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', padding: '1rem clamp(0.75rem, 3vw, 1.5rem)', background: 'var(--bg-base)' }}>
      {KPI_CONFIG.map((kpi) => (
        <div key={kpi.key} className="signature-card" style={{ padding: '0.875rem 1.125rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'default' }}>
          <div>
            <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{t(kpi.labelKey)}</p>
            <h4 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-mono, monospace)', margin: 0 }}>{stats[kpi.key]}</h4>
          </div>
        </div>
      ))}
    </div>
  );
}

