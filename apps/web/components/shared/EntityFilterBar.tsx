'use client';

import { ENTITY_COLORS, EntityType } from '@/types/entities';
import { useGraphStore } from '@/store/graphStore';
import { useTranslation } from '@/lib/i18n';

const ENTITY_TYPES: EntityType[] = [
  'PERSON', 'ORGANIZATION', 'LOCATION', 'EMAIL', 'ADDRESS', 'DATE', 'PHONE', 'IP_ADDRESS', 'URL',
];

interface EntityFilterBarProps {
  className?: string;
  showCounts?: boolean;
}

export default function EntityFilterBar({ className = '', showCounts = false }: EntityFilterBarProps) {
  const { filters, setFilter, resetFilters } = useGraphStore();
  const { t } = useTranslation();

  const toggleType = (type: EntityType) => {
    const current = filters.entityTypes;
    const updated = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    setFilter('entityTypes', updated);
  };

  const DEFAULT_TYPES: EntityType[] = ['PERSON', 'ORGANIZATION', 'LOCATION'];
  const isDefault =
    filters.entityTypes.length === DEFAULT_TYPES.length &&
    filters.entityTypes.every((t) => DEFAULT_TYPES.includes(t));

  return (
    <div
      className={`flex items-center gap-8 ${className}`}
      style={{ overflow: 'hidden' }}
    >
      <div className="flex gap-3 overflow-x-auto py-2 px-4 custom-scrollbar flex-1 no-scrollbar items-center">
        <button
          onClick={resetFilters}
          disabled={isDefault}
          title={t('shared.reset_tooltip')}
          className="flex items-center justify-center gap-1.5 w-[120px] h-[28px] px-2 rounded-sm transition-all duration-300 shrink-0"
          style={{
            background: isDefault ? 'var(--color-surface-raised)' : '#2a2438',
            color: isDefault ? 'var(--color-text-muted)' : 'var(--color-primary)',
            opacity: isDefault ? 0.4 : 1,
            cursor: isDefault ? 'not-allowed' : 'pointer',
          }}
        >
          <div className="w-1.5 h-1.5 flex items-center justify-center shrink-0">
            <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </div>
          <span className="text-[10px] font-mono tracking-wider font-medium">
            {t('shared.reset')}
          </span>
        </button>
        <div className="w-[1px] h-4 shrink-0 mx-1" style={{ background: 'var(--color-surface-hover)' }} />
        {ENTITY_TYPES.map((type) => {
          const active = filters.entityTypes.includes(type);
          const typeLabel = t('entity.' + type);
          return (
            <button
              key={type}
              id={`filter-${type}`}
              onClick={() => toggleType(type)}
              title={t('shared.toggle_tooltip', { type: typeLabel })}
              className={`
                flex items-center justify-center gap-1.5 w-[120px] h-[28px] px-2 rounded-sm transition-all duration-300 shrink-0
                ${active ? 'opacity-100 scale-100' : 'opacity-40 grayscale scale-95 hover:opacity-60'}
              `}
              style={{
                background: active ? `color-mix(in srgb, ${ENTITY_COLORS[type]} 22%, var(--color-surface-raised))` : 'var(--color-surface-raised)',
              }}
            >
              <div
                className="w-1.5 h-1.5 rounded-none shrink-0"
                style={{
                  background: ENTITY_COLORS[type],
                }}
              />
              <span className="text-[10px] font-mono tracking-wider text-white/60 font-medium">
                {typeLabel}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
