import { ENTITY_COLORS, EntityType } from '@/types/entities';
import { useTranslation } from '@/lib/i18n';

interface TopEntitiesLeaderboardProps {
  topEntities: Array<{
    label: string;
    type: string;
    count: number;
  }>;
  displayLimit: number;
  setDisplayLimit: (limit: number) => void;
}

export default function TopEntitiesLeaderboard({
  topEntities,
  displayLimit,
  setDisplayLimit,
}: TopEntitiesLeaderboardProps) {
  const { t } = useTranslation();
  return (
    <div
      className="signature-card flex flex-col"
      style={{
        padding: '2.5rem',
        gap: '2.5rem',
      }}
    >
      <div className="flex items-center justify-between shrink-0">
        <h3 className="text-sm font-semibold text-white/70">
          {t('stats.leaderboard.title')}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/30 tracking-wider font-mono">{t('stats.leaderboard.show')}</span>
          <select
            value={displayLimit}
            onChange={(e) => setDisplayLimit(Number(e.target.value))}
            className="bg-white/5 border border-white/10 rounded-sm text-xs text-white/70 px-2 py-1 outline-none hover:border-white/20 transition-all font-mono"
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              cursor: 'pointer',
            }}
          >
            <option value={5} style={{ background: '#0e1217', color: '#fff' }}>5</option>
            <option value={10} style={{ background: '#0e1217', color: '#fff' }}>10</option>
            <option value={15} style={{ background: '#0e1217', color: '#fff' }}>15</option>
            <option value={20} style={{ background: '#0e1217', color: '#fff' }}>20</option>
            <option value={30} style={{ background: '#0e1217', color: '#fff' }}>30</option>
            <option value={50} style={{ background: '#0e1217', color: '#fff' }}>50</option>
            <option value={100} style={{ background: '#0e1217', color: '#fff' }}>100</option>
          </select>
        </div>
      </div>
      <div
        className="overflow-y-auto flex-1 pr-1 custom-scrollbar flex flex-col"
        style={{ gap: '0.875rem' }}
      >
        {topEntities.slice(0, displayLimit).map((entity, i) => (
          <div
            key={entity.label}
            className="flex items-center gap-4 group border-b border-white/[0.05] last:border-0"
            style={{ paddingBottom: '0.875rem' }}
          >
            <div className="w-9 h-9 shrink-0 rounded-sm bg-white/5 border border-white/5 flex items-center justify-center font-mono text-[10px] text-white/25 group-hover:border-accent/30 group-hover:text-accent transition-all duration-200">
              {String(i + 1).padStart(2, '0')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white/90 truncate leading-snug">
                {entity.label}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div
                  className="w-1.5 h-1.5 rounded-none shrink-0"
                  style={{ background: ENTITY_COLORS[entity.type as EntityType] || 'var(--accent)' }}
                />
                <span className="text-[9px] tracking-widest text-white/30 font-mono">
                  {t('entity.' + entity.type)}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold font-mono text-accent">{entity.count}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
