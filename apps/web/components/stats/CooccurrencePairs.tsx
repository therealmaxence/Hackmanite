import { ENTITY_COLORS, EntityType } from '@/types/entities';
import { useTranslation } from '@/lib/i18n';

interface CooccurrencePair {
  typeA: string;
  typeB: string;
  count: number;
}

interface CooccurrencePairsProps {
  cooccurrences: CooccurrencePair[];
}

export default function CooccurrencePairs({ cooccurrences }: CooccurrencePairsProps) {
  const { t } = useTranslation();
  return (
    <div
      className="signature-card flex flex-col justify-between"
      style={{
        padding: '2.5rem',
        gap: '2.5rem',
      }}
    >
      <h3 className="text-sm font-semibold text-white/70">
        {t('stats.cross_cat.title')}
      </h3>

      {cooccurrences.length === 0 ? (
        <div className="h-[200px] flex items-center justify-center">
          <p className="text-xs font-mono text-white/30 uppercase tracking-widest">
            {t('stats.cross_cat.no_data')}
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-4">
          <div className="space-y-4">
            {cooccurrences.map((pair, i) => (
              <div
                key={`${pair.typeA}-${pair.typeB}`}
                className="flex items-center justify-between border-b border-white/[0.04] pb-4 last:border-0 last:pb-0"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-[10px] text-white/20">
                    #{String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-white/[0.02] border border-white/[0.04]">
                      <div
                        className="w-1.5 h-1.5"
                        style={{ background: ENTITY_COLORS[pair.typeA as EntityType] || '#6b7280' }}
                      />
                      <span className="text-[10px] tracking-wider text-white/60 font-mono">
                        {t('entity.' + pair.typeA)}
                      </span>
                    </div>
                    <span className="text-white/20 font-mono text-xs">⟷</span>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-white/[0.02] border border-white/[0.04]">
                      <div
                        className="w-1.5 h-1.5"
                        style={{ background: ENTITY_COLORS[pair.typeB as EntityType] || '#6b7280' }}
                      />
                      <span className="text-[10px] tracking-wider text-white/60 font-mono">
                        {t('entity.' + pair.typeB)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono text-xs text-white/70">
                    {t('stats.cross_cat.links', { count: pair.count })}
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
