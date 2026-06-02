'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSWRConfig } from 'swr';
import { useGraphStore } from '@/store/graphStore';
import { useUploadStore } from '@/store/uploadStore';
import { computeGraphCommunities } from '@/lib/graphCommunities';
import GraphSearch from './GraphSearch';
import GraphFilterSliders from './GraphFilterSliders';
import GraphActions from './GraphActions';

export default function GraphControls() {
  const { setFilter, filters, resetFilters, clearGraph, nodes, edges, triggerRefresh, triggerLayout } = useGraphStore();
  const { sessionId, resetSession, setSessionId, addFiles } = useUploadStore();
  const { mutate } = useSWRConfig();
  const [localSearch, setLocalSearch] = useState('');

  useEffect(() => { setLocalSearch(filters.searchQuery); }, [filters.searchQuery]);

  const communityMap = useMemo(() => computeGraphCommunities(nodes, edges), [nodes, edges]);
  const sortedCommunities = useMemo(() => {
    const counts = new Map<string, number>();
    for (const label of communityMap.values()) counts.set(label, (counts.get(label) ?? 0) + 1);
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id, count], i) => ({ id, name: `Community ${i + 1}`, count }));
  }, [communityMap]);

  const handleSearch = (val: string) => { setLocalSearch(val); setFilter('searchQuery', val); };

  const handleDateChange = (key: 'from' | 'to', value: string) => {
    setFilter('dateRange', { ...filters.dateRange, [key]: value ? makeLocalDayBoundary(value, key === 'to') : null });
  };

  const handleResetGraph = async () => {
    if (!confirm('Permanently delete all graph data and files in this session?')) return;
    try {
      if (sessionId) await fetch(`/api/session/${sessionId}`, { method: 'DELETE' });
      clearGraph();
      resetSession();
    } catch (err) {
      console.error('Failed to reset graph', err);
    }
  };

  return (
    <div className="graph-controls signature-panel" style={{ width: 360, maxWidth: '100%', display: 'flex', flexDirection: 'column', padding: '1.5rem 1.25rem 1.25rem', gap: '1.25rem', overflowY: 'auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', letterSpacing: '0.04em', color: 'var(--color-text-muted)', fontWeight: 500 }}>Graph filters</span>
        <span style={{ fontSize: '0.92rem', color: 'var(--color-text)', fontWeight: 600 }}>Explore neighborhoods by hop depth</span>
      </div>

      <GraphSearch value={localSearch} onChange={handleSearch} />

      <GraphFilterSliders
        filters={filters}
        sortedCommunities={sortedCommunities}
        onFilterChange={setFilter}
        onDateChange={handleDateChange}
      />

      <GraphActions
        sessionId={sessionId}
        onResetFilters={resetFilters}
        onResetGraph={handleResetGraph}
        onExplodeGraph={triggerLayout}
        onImportSuccess={(newSessionId, files) => {
          if (!sessionId && newSessionId) setSessionId(newSessionId);
          if (Array.isArray(files)) addFiles(files);
          mutate((key) => typeof key === 'string' && key.includes('/api/graph/'));
          triggerRefresh();
        }}
      />
    </div>
  );
}



function makeLocalDayBoundary(value: string, endOfDay: boolean) {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
}
