'use client';

import { useState, useMemo } from 'react';
import { useSWRConfig } from 'swr';
import { useGraphStore } from '@/store/graphStore';
import { useUploadStore } from '@/store/uploadStore';
import { useTranslation } from '@/lib/i18n';
import { GraphNode } from '@/lib/graph-builder';
import { ENTITY_COLORS, EntityType } from '@/types/entities';

interface EntityTableViewProps {
  nodes: GraphNode[];
}

type SortField = 'label' | 'type' | 'totalOccurrences' | 'fileCount' | 'tfidf';
type SortOrder = 'asc' | 'desc';

export default function EntityTableView({ nodes }: EntityTableViewProps) {
  const { t } = useTranslation();
  const { sessionId } = useUploadStore();
  const { mutate } = useSWRConfig();
  const {
    selectedNodeId,
    selectNode,
    removeNode,
    togglePanel,
    addCooccurrenceNodeId,
    setCooccurrenceModalOpen,
  } = useGraphStore();

  const [sortField, setSortField] = useState<SortField>('totalOccurrences');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

  const entities = useMemo(() => {
    return nodes.filter((n) => n.type !== 'FILE');
  }, [nodes]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedEntities = useMemo(() => {
    const sorted = [...entities];
    sorted.sort((a, b) => {
      let valA: string | number = 0;
      let valB: string | number = 0;

      if (sortField === 'label') {
        valA = a.label.toLowerCase();
        valB = b.label.toLowerCase();
      } else if (sortField === 'type') {
        valA = a.type.toLowerCase();
        valB = b.type.toLowerCase();
      } else if (sortField === 'totalOccurrences') {
        valA = a.totalOccurrences;
        valB = b.totalOccurrences;
      } else if (sortField === 'fileCount') {
        valA = a.fileCount;
        valB = b.fileCount;
      } else if (sortField === 'tfidf') {
        valA = a.tfidf ?? a.totalOccurrences;
        valB = b.tfidf ?? b.totalOccurrences;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [entities, sortField, sortOrder]);

  const handleDeleteNode = async (e: React.MouseEvent, id: string, label: string) => {
    e.stopPropagation();
    if (!confirm(t('graph.panel.confirm_delete_entity', { name: label }))) return;
    try {
      removeNode(id);
      if (selectedNodeId === id) {
        togglePanel(false);
        selectNode(null);
      }
      const res = await fetch(`/api/entities/${id}?sessionId=${sessionId}`, { method: 'DELETE' });
      if (!res.ok) console.error('Failed to delete node from server');
      mutate((key: unknown) => typeof key === 'string' && key.includes('/api/graph/'));
    } catch (err) {
      console.error('Failed to delete node', err);
    }
  };

  const handleHideNode = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const getRes = await fetch(`/api/session/${sessionId}/settings`);
      if (!getRes.ok) throw new Error('Failed to fetch session settings');
      const settings = await getRes.json();
      
      const hiddenIds: string[] = JSON.parse(settings.hiddenNodeIds || '[]');
      if (!hiddenIds.includes(id)) {
        hiddenIds.push(id);
      }

      const postRes = await fetch(`/api/session/${sessionId}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hiddenNodeIds: JSON.stringify(hiddenIds) }),
      });
      if (!postRes.ok) throw new Error('Failed to update hidden nodes');

      removeNode(id);
      if (selectedNodeId === id) {
        togglePanel(false);
        selectNode(null);
      }
      mutate((key: unknown) => typeof key === 'string' && (key.includes('/api/graph/') || key.includes('/api/stats')));
    } catch (err) {
      console.error('Failed to hide node', err);
    }
  };

  const handleChangeNodeType = async (e: React.ChangeEvent<HTMLSelectElement>, id: string) => {
    const newType = e.target.value;
    try {
      const res = await fetch(`/api/entities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: newType, sessionId }),
      });
      if (!res.ok) {
        console.error('Failed to change node type');
        return;
      }
      mutate((key: unknown) => typeof key === 'string' && (key.includes('/api/graph/') || key.includes('/api/stats')));
    } catch (err) {
      console.error('Failed to change node type', err);
    }
  };

  const handleSearchCooccurrence = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    addCooccurrenceNodeId(id);
    setCooccurrenceModalOpen(true);
  };

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? ' ▲' : ' ▼';
  };

  return (
    <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', background: 'var(--bg-base)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
          {t('graph.table.ledger')}
        </h3>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', background: 'var(--color-surface-raised)', padding: '2px 8px', borderRadius: 'var(--radius-sm)' }}>
          {t('graph.table.matching_records', { count: sortedEntities.length })}
        </span>
      </div>

      <div style={{ border: 'none', borderRadius: 'var(--radius)', overflow: 'hidden', background: 'var(--color-surface)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
          <thead>
            <tr style={{ background: 'var(--color-surface-raised)', borderBottom: 'none' }}>
              <th onClick={() => handleSort('label')} style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)', fontWeight: 500, cursor: 'pointer', userSelect: 'none' }}>
                {t('graph.table.col_name')}{renderSortIndicator('label')}
              </th>
              <th onClick={() => handleSort('type')} style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)', fontWeight: 500, cursor: 'pointer', userSelect: 'none' }}>
                {t('graph.table.col_type')}{renderSortIndicator('type')}
              </th>
              <th onClick={() => handleSort('totalOccurrences')} style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)', fontWeight: 500, cursor: 'pointer', userSelect: 'none' }}>
                {t('graph.table.col_occurrences')}{renderSortIndicator('totalOccurrences')}
              </th>
              <th onClick={() => handleSort('fileCount')} style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)', fontWeight: 500, cursor: 'pointer', userSelect: 'none' }}>
                {t('graph.table.col_files')}{renderSortIndicator('fileCount')}
              </th>
              <th onClick={() => handleSort('tfidf')} style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)', fontWeight: 500, cursor: 'pointer', userSelect: 'none' }}>
                {t('graph.table.col_tfidf')}{renderSortIndicator('tfidf')}
              </th>
              <th style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                {t('graph.table.col_actions')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedEntities.map((node) => {
              const isSelected = selectedNodeId === node.id;
              const isHovered = hoveredRowId === node.id;
              return (
                <tr
                  key={node.id}
                  onClick={() => selectNode(node.id)}
                  onMouseEnter={() => setHoveredRowId(node.id)}
                  onMouseLeave={() => setHoveredRowId(null)}
                  style={{
                    borderBottom: 'none',
                    cursor: 'pointer',
                    transition: 'background 200ms ease',
                    background: isSelected
                      ? 'color-mix(in srgb, var(--color-secondary) 15%, var(--color-surface-raised))'
                      : isHovered
                      ? 'var(--color-surface-hover)'
                      : 'var(--color-surface)',
                  }}
                >
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 500, color: node.color || ENTITY_COLORS[node.type as EntityType] || 'var(--color-text)' }}>
                    {node.label}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)' }}>
                    {node.type}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)' }}>
                    {node.totalOccurrences}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)' }}>
                    {node.fileCount}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)' }}>
                    {node.tfidf ? Number(node.tfidf).toFixed(2) : node.totalOccurrences}
                  </td>
                  <td style={{ padding: '0.5rem 1rem', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <select
                        value={node.type}
                        onChange={(e) => handleChangeNodeType(e, node.id)}
                        style={{
                          background: 'var(--color-surface-raised)',
                          border: '1px solid var(--color-border)',
                          color: 'var(--color-text)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '2px 4px',
                          fontSize: '0.75rem',
                          outline: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="PERSON">PERSON</option>
                        <option value="ORGANIZATION">ORGANIZATION</option>
                        <option value="LOCATION">LOCATION</option>
                        <option value="EMAIL">EMAIL</option>
                        <option value="PHONE">PHONE</option>
                        <option value="IP_ADDRESS">IP_ADDRESS</option>
                        <option value="URL">URL</option>
                        <option value="DATE">DATE</option>
                        <option value="ADDRESS">ADDRESS</option>
                      </select>

                      <button
                        onClick={(e) => handleSearchCooccurrence(e, node.id)}
                        title={t('graph.canvas.search_cooccurrence')}
                        style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', padding: 4 }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-primary-hover)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="11" cy="11" r="8" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                      </button>

                      <button
                        onClick={(e) => handleHideNode(e, node.id)}
                        title={t('graph.canvas.hide_node')}
                        style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', padding: 4 }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-primary-hover)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      </button>

                      <button
                        onClick={(e) => handleDeleteNode(e, node.id, node.label)}
                        title={t('graph.canvas.delete_node')}
                        style={{ background: 'transparent', border: 'none', color: 'var(--color-error)', cursor: 'pointer', display: 'flex', padding: 4 }}
                        onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
