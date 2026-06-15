import { TooltipProps } from 'recharts';
import { EntityType } from '@/types/entities';
import { useTranslation } from '@/lib/i18n';

export function KPICard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub: string;
  color: string;
}) {
  return (
    <div
      className="signature-card group flex flex-col justify-between"
      style={{
        padding: '2rem',
        minHeight: '170px',
        position: 'relative',
        gap: '1.5rem',
      }}
    >
      <div className="relative z-10 flex flex-col gap-3" style={{ padding: 0, margin: 0 }}>
        <p className="text-[11px] font-medium text-white/40 leading-none" style={{ padding: 0, margin: 0 }}>
          {label}
        </p>
        <p className="text-4xl font-bold font-mono text-white/90 leading-none break-all" style={{ padding: 0, margin: 0 }}>
          {value}
        </p>
      </div>
      <p className="text-xs text-white/25 italic leading-none z-10" style={{ padding: 0, margin: 0 }}>{sub}</p>
    </div>
  );
}

export const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  const { t } = useTranslation();
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    const type = (d.type || 'UNKNOWN') as EntityType;
    return (
      <div
        className="px-4 py-3 rounded-sm shadow-lg"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <p className="text-[9px] tracking-[0.1em] text-white/40 mb-1">{t('entity.' + type)}</p>
        <p className="text-lg font-bold font-mono text-accent">
          {payload[0].value}{' '}
          <span className="text-[10px] font-normal text-white/30 ml-1">{t('stats.tooltip.entries')}</span>
        </p>
      </div>
    );
  }
  return null;
};
