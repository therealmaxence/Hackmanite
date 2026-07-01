'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import { ENTITY_COLORS, EntityType } from '@/types/entities';

interface Signal {
  id: string;
  label: string;
  type: string;
  totalCount: number;
  fileCount: number;
  score: number;
}

interface WeakSignalsTableProps {
  bridgeSignals: Signal[];
  nicheSignals: Signal[];
  emergingSignals: Signal[];
}

type TabKey = 'bridge' | 'niche' | 'emerging';
type SortField = 'label' | 'type' | 'totalCount' | 'fileCount' | 'score';
type SortOrder = 'asc' | 'desc';

export default function WeakSignalsTable({
  bridgeSignals,
  nicheSignals,
  emergingSignals,
}: WeakSignalsTableProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>('bridge');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('score');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const [hoveredBtn, setHoveredBtn] = useState<string | number | null>(null);
  const [hoveredTab, setHoveredTab] = useState<TabKey | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<TabKey | null>(null);

  const PAGE_SIZE = 15;

  useEffect(() => {
    setCurrentPage(1);
    setSearchQuery('');
    setSortField('score');
    setSortOrder('desc');
  }, [activeTab]);

  const activeSignals = useMemo(() => {
    if (activeTab === 'bridge') return bridgeSignals;
    if (activeTab === 'niche') return nicheSignals;
    return emergingSignals;
  }, [activeTab, bridgeSignals, nicheSignals, emergingSignals]);

  const filteredSignals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return activeSignals;
    return activeSignals.filter((s) => s.label.toLowerCase().includes(q));
  }, [activeSignals, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedSignals = useMemo(() => {
    const sorted = [...filteredSignals];
    sorted.sort((a, b) => {
      let valA: string | number = 0;
      let valB: string | number = 0;

      if (sortField === 'label') {
        valA = a.label.toLowerCase();
        valB = b.label.toLowerCase();
      } else if (sortField === 'type') {
        valA = a.type.toLowerCase();
        valB = b.type.toLowerCase();
      } else if (sortField === 'totalCount') {
        valA = a.totalCount;
        valB = b.totalCount;
      } else if (sortField === 'fileCount') {
        valA = a.fileCount;
        valB = b.fileCount;
      } else if (sortField === 'score') {
        valA = a.score;
        valB = b.score;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredSignals, sortField, sortOrder]);

  const totalPages = Math.ceil(sortedSignals.length / PAGE_SIZE) || 1;

  const paginatedSignals = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedSignals.slice(start, start + PAGE_SIZE);
  }, [sortedSignals, currentPage]);

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? ' ▲' : ' ▼';
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const delta = 1;
    const left = currentPage - delta;
    const right = currentPage + delta;

    let range: number[] = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= left && i <= right)) {
        range.push(i);
      }
    }

    let l: number | null = null;
    for (const i of range) {
      if (l !== null) {
        if (i - l === 2) {
          pages.push(l + 1);
        } else if (i - l > 2) {
          pages.push('...');
        }
      }
      pages.push(i);
      l = i;
    }
    return pages;
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'bridge', label: t('weak_signals.bridges.title') },
    { key: 'niche', label: t('weak_signals.niche.title') },
    { key: 'emerging', label: t('weak_signals.emerging.title') },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', gap: '1.5rem', overflow: 'visible' }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const isHovered = hoveredTab === tab.key;
          return (
            <div
              key={tab.key}
              onMouseEnter={() => setHoveredTab(tab.key)}
              onMouseLeave={() => setHoveredTab(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                borderBottom: isActive
                  ? '2px solid var(--color-primary)'
                  : isHovered
                  ? '2px solid var(--color-border)'
                  : '2px solid transparent',
                color: isActive
                  ? 'var(--color-text)'
                  : isHovered
                  ? 'var(--color-text-muted)'
                  : 'var(--color-text-muted)',
                opacity: isActive ? 1 : isHovered ? 0.9 : 0.6,
                padding: '0.75rem 0.25rem',
                fontSize: '0.9375rem',
                fontWeight: isActive ? 600 : 500,
                transition: 'all 0.2s ease',
                marginBottom: '-1px',
              }}
            >
              <button
                onClick={() => setActiveTab(tab.key)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'inherit',
                  fontSize: 'inherit',
                  fontWeight: 'inherit',
                  cursor: 'pointer',
                  padding: 0,
                  outline: 'none',
                }}
              >
                {tab.label}
              </button>
              
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span
                  onMouseEnter={() => setActiveTooltip(tab.key)}
                  onMouseLeave={() => setActiveTooltip(null)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    border: '1px solid var(--color-text-muted)',
                    color: 'var(--color-text-muted)',
                    fontSize: '9px',
                    cursor: 'help',
                    opacity: isHovered || isActive ? 0.8 : 0.4,
                    transition: 'all 0.15s ease',
                    userSelect: 'none',
                  }}
                >
                  i
                </span>
                
                {activeTooltip === tab.key && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 'calc(100% + 8px)',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'var(--color-surface-raised)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.75rem 1rem',
                      width: '280px',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                      zIndex: 100,
                      pointerEvents: 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      textAlign: 'left',
                      whiteSpace: 'normal',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text)' }}>
                      {tab.label}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                      {t(`weak_signals.${tab.key}.desc`)}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '9px',
                      color: 'var(--color-primary-hover)',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.04)',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '2px',
                      marginTop: '2px',
                      wordBreak: 'break-word',
                    }}>
                      {t(`weak_signals.${tab.key}.formula`)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <input
            type="text"
            placeholder={t('graph.controls.search_placeholder') || 'Search entities...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
              borderRadius: 'var(--radius)',
              padding: '0.5rem 1rem 0.5rem 2.5rem',
              fontSize: '0.8125rem',
              outline: 'none',
              transition: 'border-color 0.2s ease',
            }}
          />
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{
              position: 'absolute',
              left: '0.875rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-muted)',
              opacity: 0.5,
              pointerEvents: 'none',
            }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>

        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', background: 'var(--color-surface-raised)', padding: '4px 10px', borderRadius: 'var(--radius-sm)' }}>
          {t('graph.table.matching_records', { count: sortedSignals.length })}{sortedSignals.length > PAGE_SIZE && ` (Page ${currentPage} of ${totalPages})`}
        </span>
      </div>

      {/* Table view */}
      <div style={{ border: 'none', borderRadius: 'var(--radius)', overflow: 'hidden', background: 'var(--color-surface)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '400px' }}>
        <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 380px)', minHeight: '300px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface-raised)', borderBottom: 'none' }}>
                <th onClick={() => handleSort('label')} style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--color-surface-raised)', padding: '0.75rem 1rem', color: 'var(--color-text-muted)', fontWeight: 500, cursor: 'pointer', userSelect: 'none' }}>
                  {t('graph.table.col_name')}{renderSortIndicator('label')}
                </th>
                <th onClick={() => handleSort('type')} style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--color-surface-raised)', padding: '0.75rem 1rem', color: 'var(--color-text-muted)', fontWeight: 500, cursor: 'pointer', userSelect: 'none' }}>
                  {t('graph.table.col_type')}{renderSortIndicator('type')}
                </th>
                <th onClick={() => handleSort('totalCount')} style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--color-surface-raised)', padding: '0.75rem 1rem', color: 'var(--color-text-muted)', fontWeight: 500, cursor: 'pointer', userSelect: 'none' }}>
                  {t('graph.table.col_occurrences')}{renderSortIndicator('totalCount')}
                </th>
                <th onClick={() => handleSort('fileCount')} style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--color-surface-raised)', padding: '0.75rem 1rem', color: 'var(--color-text-muted)', fontWeight: 500, cursor: 'pointer', userSelect: 'none' }}>
                  {t('graph.table.col_files')}{renderSortIndicator('fileCount')}
                </th>
                <th onClick={() => handleSort('score')} style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--color-surface-raised)', padding: '0.75rem 1rem', color: 'var(--color-text-muted)', fontWeight: 500, cursor: 'pointer', userSelect: 'none' }}>
                  {t('weak_signals.table.col_score')}{renderSortIndicator('score')}
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedSignals.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--color-text-muted)', opacity: 0.5 }}>
                    {activeTab === 'bridge'
                      ? t('weak_signals.bridges.no_data')
                      : activeTab === 'niche'
                      ? t('weak_signals.niche.no_data')
                      : t('weak_signals.emerging.no_data')}
                  </td>
                </tr>
              ) : (
                paginatedSignals.map((signal) => {
                  const isHovered = hoveredRowId === signal.id;
                  const typeColor = ENTITY_COLORS[signal.type as EntityType] || '#6b7280';
                  return (
                    <tr
                      key={signal.id}
                      onMouseEnter={() => setHoveredRowId(signal.id)}
                      onMouseLeave={() => setHoveredRowId(null)}
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        transition: 'background 200ms ease',
                        background: isHovered ? 'var(--color-surface-hover)' : 'var(--color-surface)',
                      }}
                    >
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 500, color: typeColor }}>
                        {signal.label}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)' }}>
                        {t(`entity.${signal.type}`) || signal.type}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)' }}>
                        {signal.totalCount}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)' }}>
                        {signal.fileCount}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span className="font-mono text-xs text-accent bg-accent/5 border border-accent/15 px-2 py-0.5 rounded-sm">
                          {signal.score.toFixed(3)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', padding: '1rem 0', background: 'var(--color-surface-raised)', borderTop: '1px solid var(--color-border)' }}>
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              onMouseEnter={() => setHoveredBtn('first')}
              onMouseLeave={() => setHoveredBtn(null)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32,
                background: hoveredBtn === 'first' && currentPage !== 1 ? 'var(--color-surface-hover)' : 'var(--color-surface-raised)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)', color: 'var(--color-text)', cursor: 'pointer',
                opacity: currentPage === 1 ? 0.35 : 1, transition: 'all 0.15s ease',
              }}
            >
              «
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              onMouseEnter={() => setHoveredBtn('prev')}
              onMouseLeave={() => setHoveredBtn(null)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32,
                background: hoveredBtn === 'prev' && currentPage !== 1 ? 'var(--color-surface-hover)' : 'var(--color-surface-raised)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)', color: 'var(--color-text)', cursor: 'pointer',
                opacity: currentPage === 1 ? 0.35 : 1, transition: 'all 0.15s ease',
              }}
            >
              ‹
            </button>

            {getPageNumbers().map((p, idx) => {
              if (p === '...') {
                return (
                  <span key={`ellipsis-${idx}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
                    ...
                  </span>
                );
              }
              const isCurrent = currentPage === p;
              return (
                <button
                  key={`page-${p}`}
                  onClick={() => setCurrentPage(Number(p))}
                  onMouseEnter={() => setHoveredBtn(p)}
                  onMouseLeave={() => setHoveredBtn(null)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32,
                    background: isCurrent ? 'var(--color-primary)' : hoveredBtn === p ? 'var(--color-surface-hover)' : 'var(--color-surface-raised)',
                    border: isCurrent ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)', color: isCurrent ? 'var(--color-on-primary)' : 'var(--color-text)',
                    fontWeight: isCurrent ? 600 : 400, cursor: 'pointer', transition: 'all 0.15s ease',
                  }}
                >
                  {p}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              onMouseEnter={() => setHoveredBtn('next')}
              onMouseLeave={() => setHoveredBtn(null)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32,
                background: hoveredBtn === 'next' && currentPage !== totalPages ? 'var(--color-surface-hover)' : 'var(--color-surface-raised)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)', color: 'var(--color-text)', cursor: 'pointer',
                opacity: currentPage === totalPages ? 0.35 : 1, transition: 'all 0.15s ease',
              }}
            >
              ›
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              onMouseEnter={() => setHoveredBtn('last')}
              onMouseLeave={() => setHoveredBtn(null)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32,
                background: hoveredBtn === 'last' && currentPage !== totalPages ? 'var(--color-surface-hover)' : 'var(--color-surface-raised)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)', color: 'var(--color-text)', cursor: 'pointer',
                opacity: currentPage === totalPages ? 0.35 : 1, transition: 'all 0.15s ease',
              }}
            >
              »
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
