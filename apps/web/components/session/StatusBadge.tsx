import { useTranslation } from '@/lib/i18n';

export type ExportState = 'idle' | 'loading' | 'done' | 'error';
export type ImportState = 'idle' | 'parsing' | 'uploading' | 'done' | 'error';

interface StatusBadgeProps {
  state: ExportState | ImportState;
  errorMsg?: string;
}

export default function StatusBadge({ state, errorMsg }: StatusBadgeProps) {
  const { t } = useTranslation();
  const config: Record<string, { label: string; color: string; bg: string }> = {
    idle:      { label: t('status.idle'),      color: 'var(--color-text-muted)', bg: 'rgba(255,255,255,0.04)' },
    loading:   { label: t('status.loading'),   color: '#FFB830',                 bg: 'rgba(255,184,48,0.1)'   },
    parsing:   { label: t('status.parsing'),   color: '#4C9EF0',                 bg: 'rgba(76,158,240,0.1)'   },
    uploading: { label: t('status.uploading'), color: '#4C9EF0',                 bg: 'rgba(76,158,240,0.1)'   },
    done:      { label: t('status.done'),      color: '#10B981',                 bg: 'rgba(16,185,129,0.1)'   },
    error:     { label: errorMsg || t('status.error'), color: '#EC4899',         bg: 'rgba(236,72,153,0.1)'   },
  };
  const { label, color, bg } = config[state] ?? config.idle;
  return (
    <span style={{
      fontSize: '0.75rem', fontWeight: 500, fontFamily: 'var(--font-mono)',
      color, background: bg,
      border: `1px solid ${color}33`,
      borderRadius: '6px', padding: '3px 10px',
      display: 'inline-block',
    }}>
      {label}
    </span>
  );
}
