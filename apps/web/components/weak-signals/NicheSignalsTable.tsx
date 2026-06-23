import { ENTITY_COLORS, EntityType } from '@/types/entities';
import { useTranslation } from '@/lib/i18n';

interface Props {
  signals: Array<{ id: string; label: string; type: string; totalCount: number; fileCount: number; score: number }>;
}

export default function NicheSignalsTable({ signals }: Props) {
  const { t } = useTranslation();
  return (
    <div className="signature-card flex flex-col justify-between" style={{ padding: '2.5rem', gap: '2.5rem' }}>
      <h3 className="text-sm font-semibold text-white/70">{t('weak_signals.niche.title')}</h3>
      {signals.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center">
          <p className="text-xs font-mono text-white/30 uppercase tracking-widest">{t('weak_signals.niche.no_data')}</p>
        </div>
      ) : (
        <div className="overflow-y-auto flex-1 pr-1 custom-scrollbar flex flex-col gap-4">
          <div className="space-y-3">
            {signals.map((entity, i) => (
              <div key={entity.id} className="flex items-center justify-between border-b border-white/[0.04] pb-3 last:border-0 last:pb-0">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-[10px] text-white/20">#{String(i + 1).padStart(2, '0')}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white/90 truncate leading-snug">{entity.label}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-none shrink-0" style={{ background: ENTITY_COLORS[entity.type as EntityType] || '#6b7280' }} />
                      <span className="text-[9px] tracking-widest text-white/30 font-mono">
                        {t(`entity.${entity.type}`)} &middot; {entity.fileCount} file{entity.fileCount > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono text-xs text-accent bg-accent/5 border border-accent/15 px-2 py-0.5 rounded-sm">
                    {entity.score.toFixed(3)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
