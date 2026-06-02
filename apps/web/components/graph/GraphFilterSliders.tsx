'use client';

import { GraphFilters } from '@/types/graph';
import { EntityType } from '@/types/entities';

function toLocalDateInputValue(date: Date | null) {
  if (!date) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

interface Community { id: string; name: string; count: number }

interface Props {
  filters: GraphFilters;
  sortedCommunities: Community[];
  onFilterChange: <K extends keyof GraphFilters>(key: K, val: GraphFilters[K]) => void;
  onDateChange: (key: 'from' | 'to', value: string) => void;
}

export default function GraphFilterSliders({ filters, sortedCommunities, onFilterChange, onDateChange }: Props) {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label htmlFor="graph-min-conn-input" style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title="Minimum connections">Min connections</label>
          <input
            id="graph-min-conn-input"
            type="number"
            min="0"
            value={filters.minConnections}
            onChange={(e) => {
              const val = e.target.value;
              onFilterChange('minConnections', val === '' ? 0 : Math.max(0, parseInt(val, 10) || 0));
            }}
            className="signature-input"
            style={{ height: 40, padding: '0 0.5rem', width: '100%', minWidth: 0 }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label htmlFor="graph-min-occ-input" style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title="Minimum occurrences">Min occurrences</label>
          <input
            id="graph-min-occ-input"
            type="number"
            min="1"
            value={filters.minOccurrences}
            onChange={(e) => {
              const val = e.target.value;
              onFilterChange('minOccurrences', val === '' ? 1 : Math.max(1, parseInt(val, 10) || 1));
            }}
            className="signature-input"
            style={{ height: 40, padding: '0 0.5rem', width: '100%', minWidth: 0 }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label htmlFor="graph-min-weight-input" style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title="Min connection weight">Min weight</label>
          <input
            id="graph-min-weight-input"
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={filters.minEdgeWeight}
            onChange={(e) => {
              const val = e.target.value;
              onFilterChange('minEdgeWeight', val === '' ? 0 : Math.max(0, Math.min(1, parseFloat(val) || 0)));
            }}
            className="signature-input"
            style={{ height: 40, padding: '0 0.5rem', width: '100%', minWidth: 0 }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Cross-document only</span>
        <div
          id="graph-cross-doc-toggle"
          onClick={() => onFilterChange('crossDocumentOnly', !filters.crossDocumentOnly)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16,0,43,0.4)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '0.5rem 0.875rem', cursor: 'pointer', userSelect: 'none' }}
        >
          <input type="checkbox" checked={filters.crossDocumentOnly} readOnly style={{ accentColor: 'var(--color-primary)', cursor: 'pointer', width: 14, height: 14 }} />
          <span style={{ fontSize: '0.78rem', color: filters.crossDocumentOnly ? 'var(--color-text)' : 'var(--color-text-muted)', fontWeight: 600 }}>{filters.crossDocumentOnly ? 'On' : 'Off'}</span>
        </div>
      </div>

      {sortedCommunities.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Filter by community</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'rgba(16,0,43,0.4)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '0.75rem 1rem', maxHeight: 130, overflowY: 'auto' }} className="custom-scrollbar">
            {sortedCommunities.map((comm) => {
              const isHidden = filters.hiddenCommunities.includes(comm.id);
              return (
                <label key={comm.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.78rem', color: isHidden ? 'var(--color-text-muted)' : 'var(--color-text)', cursor: 'pointer', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={!isHidden}
                    onChange={(e) => onFilterChange('hiddenCommunities', e.target.checked ? filters.hiddenCommunities.filter((id) => id !== comm.id) : [...filters.hiddenCommunities, comm.id])}
                    style={{ accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                  />
                  <span>{comm.name} <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>({comm.count} {comm.count === 1 ? 'node' : 'nodes'})</span></span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Date range</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {(['from', 'to'] as const).map((key) => (
            <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.78rem', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
              {key === 'from' ? 'Begin' : 'End'}
              <input type="date" value={toLocalDateInputValue(filters.dateRange[key])} onChange={(e) => onDateChange(key, e.target.value)} className="signature-input" style={{ height: 40, padding: '0 0.75rem', width: '100%' }} />
            </label>
          ))}
        </div>
      </div>
    </>
  );
}
