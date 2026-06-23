'use client';
import { ENTITY_COLORS, EntityType } from '@/types/entities';
import { useGraphStore } from '@/store/graphStore';
import { useTranslation } from '@/lib/i18n';

const TYPES: EntityType[] = ['PERSON', 'ORGANIZATION', 'LOCATION', 'EMAIL', 'ADDRESS', 'DATE', 'PHONE', 'IP_ADDRESS', 'URL'];
const DEFAULT = ['PERSON', 'ORGANIZATION', 'LOCATION'];

export default function EntityFilterBar({ className = '' }: { className?: string; showCounts?: boolean }) {
  const { filters, setFilter, resetFilters } = useGraphStore();
  const { t } = useTranslation();

  const toggleType = (type: EntityType) => {
    const cur = filters.entityTypes;
    setFilter('entityTypes', cur.includes(type) ? cur.filter(t => t !== type) : [...cur, type]);
  };

  const isDefault = filters.entityTypes.length === 3 && filters.entityTypes.every(t => DEFAULT.includes(t));

  return (
    <div className={`flex items-center gap-8 ${className}`} style={{ overflow: 'hidden' }}>
      <div className="flex gap-3 overflow-x-auto py-2 px-4 custom-scrollbar flex-1 no-scrollbar items-center">
        <button
          onClick={resetFilters} disabled={isDefault} title={t('shared.reset_tooltip')}
          className="flex items-center justify-center gap-1.5 w-[120px] h-[28px] px-2 rounded-sm transition-all duration-300 shrink-0"
          style={{
            background: isDefault ? 'var(--color-surface-raised)' : '#2a2438',
            color: isDefault ? 'var(--color-text-muted)' : 'var(--color-primary)',
            opacity: isDefault ? 0.4 : 1,
            cursor: isDefault ? 'not-allowed' : 'pointer',
          }}
        >
          <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="shrink-0">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
          <span className="text-[10px] font-mono tracking-wider font-medium">{t('shared.reset')}</span>
        </button>
        <div className="w-[1px] h-4 shrink-0 mx-1" style={{ background: 'var(--color-surface-hover)' }} />
        {TYPES.map((type) => {
          const active = filters.entityTypes.includes(type);
          const label = t('entity.' + type);
          return (
            <button
              key={type} id={`filter-${type}`} onClick={() => toggleType(type)} title={t('shared.toggle_tooltip', { type: label })}
              className={`flex items-center justify-center gap-1.5 w-[120px] h-[28px] px-2 rounded-sm transition-all duration-300 shrink-0 ${active ? 'opacity-100 scale-100' : 'opacity-40 grayscale scale-95 hover:opacity-60'}`}
              style={{ background: active ? `color-mix(in srgb, ${ENTITY_COLORS[type]} 22%, var(--color-surface-raised))` : 'var(--color-surface-raised)' }}
            >
              <div className="w-1.5 h-1.5 shrink-0" style={{ background: ENTITY_COLORS[type] }} />
              <span className="text-[10px] font-mono tracking-wider text-white/60 font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
