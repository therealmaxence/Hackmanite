'use client';

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import dynamic from 'next/dynamic';
import Header from '@/components/layout/Header';
import { useTranslation } from '@/lib/i18n';
import useSWR, { mutate } from 'swr';
import NodeConfigDrawer from '@/components/pipeline/NodeConfigDrawer';
import Button from '@/components/ui/Button';
import { useUploadStore } from '@/store/uploadStore';
import { downloadBlob } from '@/lib/download';
import InfoHint from '@/components/ui/InfoHint';

const PipelineCytoCanvas = dynamic(
  () => import('@/components/pipeline/PipelineCytoCanvas'),
  { ssr: false, loading: () => <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>Loading canvas…</div> }
);

const CATEGORY_META = {
  sources: { label: 'Sources', color: '#00f0ff' },
  filters: { label: 'Filters', color: '#f59e0b' },
  transforms: { label: 'Transforms', color: '#a78bfa' },
  visualizers: { label: 'Visualizers', color: '#fb923c' },
  outputs: { label: 'Outputs', color: '#ff2a85' },
} as const;

type CategoryKey = keyof typeof CATEGORY_META;
type PipelineTab = 'editor' | 'runs';
type PipelineDownload = { label: string; path: string; fileName: string };
type PipelineNode = {
  id: string;
  type: string;
  label: string;
  desc: string;
  inputs: any[];
  outputs: any[];
  state: string;
  disabled: boolean;
  config: any;
  position?: { x: number; y: number };
};

const CATEGORY_KEYS = Object.keys(CATEGORY_META) as CategoryKey[];
const TABS: PipelineTab[] = ['editor', 'runs'];
const JSON_HEADERS = { 'Content-Type': 'application/json' };
const DEFAULT_POSITION = { x: 300, y: 300 };
const BUTTON_XS_STYLE: CSSProperties = { minHeight: 30, padding: '0 0.875rem' };
const INPUT_STYLE: CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.625rem',
  fontSize: '0.8125rem',
  background: 'var(--color-surface-input)',
  border: '1px solid var(--color-surface-raised)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--color-text)',
  outline: 'none',
};
const PALETTE_ITEM_STYLE: CSSProperties = {
  width: '100%',
  padding: '0.625rem 0.75rem',
  background: 'var(--color-surface-raised)',
  border: '1px solid var(--color-surface-raised)',
  borderRadius: 'var(--radius)',
  cursor: 'pointer',
  transition: 'all 0.12s ease-in-out',
  textAlign: 'left',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
};
const PALETTE_HEADER_STYLE: CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0.5rem 0.25rem',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
};
const SIDEBAR_LABEL_STYLE: CSSProperties = {
  fontSize: '0.6875rem',
  fontWeight: 700,
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const NODE_TYPES_PALETTE: Record<CategoryKey, any[]> = {
  sources: [
    { type: 'source.sqlite.query', label: 'SQLite Query', desc: 'Raw SQL query against local SQLite tables', inputs: [], outputs: [{ id: 'output', type: 'tabular' }], config: { query: 'SELECT * FROM files LIMIT 10;' } },
    { type: 'source.file.document', label: 'Document File', desc: 'Ingest and process a single document file', inputs: [], outputs: [{ id: 'output', type: 'graph' }], config: { filePath: '', windowSize: 400 } },
    { type: 'source.file.email', label: 'Email File', desc: 'EML/PST email format ingestion', inputs: [], outputs: [{ id: 'output', type: 'graph' }], config: { filePath: '', windowSize: 400 } },
    { type: 'source.session', label: 'Active Session Graph', desc: 'Load graph data from a session', inputs: [], outputs: [{ id: 'output', type: 'graph' }], config: { sessionId: '' } },
    { type: 'source.kuzudb.query', label: 'KuzuDB Query', desc: 'Custom Cypher query against KuzuDB', inputs: [], outputs: [{ id: 'output', type: 'tabular' }], config: { query: 'MATCH (a:Entity)-[r:CO_OCCURS]->(b:Entity) RETURN a, r, b LIMIT 50;' } },
    { type: 'source.file.csv', label: 'CSV Ingestor', desc: 'Ingest tabular data from a CSV file', inputs: [], outputs: [{ id: 'output', type: 'tabular' }], config: { filePath: '', delimiter: ',' } },
    { type: 'source.web.scraper', label: 'Web Scraper', desc: 'Ingest and run NLP extraction on web contents', inputs: [], outputs: [{ id: 'output', type: 'graph' }], config: { url: '' } },
  ],
  filters: [
    { type: 'filter.entity_category', label: 'Filter Category', desc: 'Filter entities by category', inputs: [{ id: 'input', type: 'graph' }], outputs: [{ id: 'output', type: 'graph' }], config: { categories: ['PERSON', 'ORGANIZATION'] } },
    { type: 'filter.top_n_nodes', label: 'Top N Nodes', desc: 'Prune graph to top N nodes', inputs: [{ id: 'input', type: 'graph' }], outputs: [{ id: 'output', type: 'graph' }], config: { limit: 50, metric: 'tfidf' } },
    { type: 'filter.min_tfidf', label: 'Min TF-IDF', desc: 'Filter entities below a TF-IDF threshold', inputs: [{ id: 'input', type: 'graph' }], outputs: [{ id: 'output', type: 'graph' }], config: { min: 1 } },
    { type: 'filter.min_occurrences', label: 'Min Occurrences', desc: 'Filter by occurrence count', inputs: [{ id: 'input', type: 'graph' }], outputs: [{ id: 'output', type: 'graph' }], config: { min: 2 } },
    { type: 'filter.min_connections', label: 'Min Connections', desc: 'Filter by degree connections', inputs: [{ id: 'input', type: 'graph' }], outputs: [{ id: 'output', type: 'graph' }], config: { min: 2 } },
    { type: 'filter.edge_weight_threshold', label: 'Edge Weight', desc: 'Filter by connection weight', inputs: [{ id: 'input', type: 'graph' }], outputs: [{ id: 'output', type: 'graph' }], config: { min: 0.1 } },
    { type: 'filter.weak_signal_flag', label: 'Weak Signal', desc: 'Keep only flagged signal entities', inputs: [{ id: 'input', type: 'graph' }], outputs: [{ id: 'output', type: 'graph' }], config: { rareBridges: true, nicheTopics: true, spikingSignals: true } },
    { type: 'filter.allow_deny_list', label: 'Denylist', desc: 'Filter out specific entity names', inputs: [{ id: 'input', type: 'graph' }], outputs: [{ id: 'output', type: 'graph' }], config: { deniedNames: '' } },
    { type: 'filter.date_range', label: 'Date Range', desc: 'Filter entities by date range', inputs: [{ id: 'input', type: 'graph' }], outputs: [{ id: 'output', type: 'graph' }], config: { startDate: '', endDate: '' } },
  ],
  transforms: [
    { type: 'transform.rare_bridges', label: 'Rare Bridges', desc: 'Identify bridge signals in graph', inputs: [{ id: 'input', type: 'graph' }], outputs: [{ id: 'output', type: 'graph' }], config: { maxOccurrence: 10 } },
    { type: 'transform.niche_topics', label: 'Niche Topics', desc: 'Isolate TF-IDF niche signals', inputs: [{ id: 'input', type: 'graph' }], outputs: [{ id: 'output', type: 'graph' }], config: { maxFiles: 2 } },
    { type: 'transform.spiking_signals', label: 'Spiking Signals', desc: 'Temporal signal concentration', inputs: [{ id: 'input', type: 'graph' }], outputs: [{ id: 'output', type: 'graph' }], config: { windowWidthRatio: 0.20, minConcentration: 0.60 } },
    { type: 'transform.llm_annotate', label: 'LLM Annotate', desc: 'Annotate nodes using AI', inputs: [{ id: 'input', type: 'graph' }], outputs: [{ id: 'output', type: 'graph' }], config: { provider: 'mistral', model: 'mistral-large-latest', maxNodes: 80, prompt: 'Add a concise llmAnnotation metadata field to the most relevant nodes.' } },
    { type: 'transform.community_detect', label: 'Community Detection', desc: 'Group modular communities', inputs: [{ id: 'input', type: 'graph' }], outputs: [{ id: 'output', type: 'graph' }], config: { iterations: 4 } },
    { type: 'transform.centrality_score', label: 'Centrality Score', desc: 'Calculate betweenness centrality', inputs: [{ id: 'input', type: 'graph' }], outputs: [{ id: 'output', type: 'graph' }], config: {} },
    { type: 'transform.entity_resolver', label: 'Entity Resolver', desc: 'Deduplicate similar entities', inputs: [{ id: 'input', type: 'graph' }], outputs: [{ id: 'output', type: 'graph' }], config: { threshold: 0.85 } },
  ],
  visualizers: [
    { type: 'visualize.graph', label: 'Graph Preview', desc: 'Render the intermediate graph at this stage', inputs: [{ id: 'input', type: 'graph' }], outputs: [{ id: 'output', type: 'graph' }], config: {} },
    { type: 'visualize.table', label: 'Table Preview', desc: 'Preview tabular records as a spreadsheet table', inputs: [{ id: 'input', type: 'tabular' }], outputs: [{ id: 'output', type: 'tabular' }], config: {} },
    { type: 'visualize.timeline', label: 'Timeline Preview', desc: 'View temporal entity occurrence trends', inputs: [{ id: 'input', type: 'graph' }], outputs: [{ id: 'output', type: 'graph' }], config: {} },
  ],
  outputs: [
    { type: 'output.obsidian_vault', label: 'Obsidian Export', desc: 'Generate Obsidian vault ZIP', inputs: [{ id: 'input', type: 'graph' }], outputs: [], config: { zipName: 'obsidian-export', exportLocation: 'downloads', exportFolder: 'uploads/exports' } },
    { type: 'output.ai_report', label: 'AI Report', desc: 'Generate markdown analytical report', inputs: [{ id: 'input', type: 'graph' }], outputs: [], config: { fileName: 'ai-report.md', exportLocation: 'downloads', exportFolder: 'uploads/exports', focusType: 'general', language: 'en', apiProvider: 'mistral', apiEndpoint: 'https://api.mistral.ai/v1', apiKey: '', model: 'mistral-large-latest', topEntitiesLimit: 30, topTfidfLimit: 30, bridgesLimit: 10, weakSignalsLimit: 10, includeBridgeSignals: true, includeNicheSignals: true, includeEmergingSignals: true, customInstructions: '' } },
    { type: 'output.graphml', label: 'GraphML Export', desc: 'Export dataset to GraphML format', inputs: [{ id: 'input', type: 'graph' }], outputs: [], config: { fileName: 'export.graphml', exportLocation: 'downloads', exportFolder: 'uploads/exports' } },
    { type: 'output.json', label: 'JSON Export', desc: 'Export datasets to JSON format', inputs: [{ id: 'input', type: 'graph' }], outputs: [], config: { fileName: 'export.json', exportLocation: 'downloads', exportFolder: 'uploads/exports' } },
    { type: 'output.kuzudb_write', label: 'Commit to KuzuDB', desc: 'Write changes back to graph database', inputs: [{ id: 'input', type: 'graph' }], outputs: [], config: { confirmCommit: false } },
    { type: 'output.html_dashboard', label: 'HTML Dashboard', desc: 'Generate standalone HTML dashboard', inputs: [{ id: 'input', type: 'graph' }], outputs: [], config: { fileName: 'dashboard.html', exportLocation: 'custom', exportFolder: 'uploads/exports' } },
  ],
};

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('API Error');
  return res.json();
});

function extractExportDownloads(logs: string[]): PipelineDownload[] {
  const pattern = /Successfully wrote (JSON output|GraphML output|Obsidian vault|AI report) to: (.+)$/;
  return logs.flatMap((log) => {
    const match = log.match(pattern);
    if (!match?.[2]) return [];
    const path = match[2].trim();
    return [{ label: match[1], path, fileName: path.split(/[\\/]/).pop() || 'export.file' }];
  });
}

function downloadExportPath(relativePath: string, fileName?: string) {
  const link = document.createElement('a');
  link.href = `/api/pipelines/download?path=${encodeURIComponent(relativePath)}`;
  link.download = fileName || relativePath.split(/[\\/]/).pop() || 'export.file';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function normalizeNode(node: any): PipelineNode {
  const data = node.data || node;
  return {
    id: node.id,
    type: data.type || node.type,
    label: data.label || node.label,
    desc: data.desc || node.desc || '',
    state: data.state || 'idle',
    config: data.config || node.config || {},
    inputs: data.inputs || node.inputs || [],
    outputs: data.outputs || node.outputs || [],
    position: node.position,
    disabled: !!(data.disabled ?? node.disabled),
  };
}

function toLegacyNode(node: PipelineNode) {
  const { id, type, position, label, desc, config, inputs, outputs, state, disabled } = node;
  return { id, type, position: position || DEFAULT_POSITION, data: { type, label, desc, config, inputs, outputs, state, disabled: !!disabled } };
}

function normalizeEdge(edge: any) {
  return { id: edge.id, source: edge.source, target: edge.target };
}

function parseNodeStates(raw: any) {
  return raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;
}

function applyNodeStates(nodes: PipelineNode[], rawStates: any) {
  const states = parseNodeStates(rawStates);
  return states ? nodes.map((node) => states[node.id] ? { ...node, state: states[node.id].state } : node) : nodes;
}

function buildClientLogs(run: any) {
  const logs = ['Queuing pipeline execution…', `Dispatched run ${run.id}`];
  if (run.logs) logs.push(...(Array.isArray(run.logs) ? run.logs : run.logs.split('\n')));
  if (run.error) logs.push(`[ERROR] ${run.error}`);
  if (run.status === 'COMPLETED' || run.status === 'FAILED') logs.push(`Pipeline finished: ${run.status}`);
  return logs;
}

function makeSidebarStyle(collapsed: boolean, side: 'left' | 'right', width: number): CSSProperties {
  return {
    width: collapsed ? 0 : width,
    minWidth: collapsed ? 0 : width,
    height: '100%',
    minHeight: 0,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--color-surface)',
    borderRight: side === 'left' && !collapsed ? '1px solid var(--color-surface-raised)' : undefined,
    borderLeft: side === 'right' && !collapsed ? '1px solid var(--color-surface-raised)' : undefined,
    transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    zIndex: 10,
  };
}

function SidebarToggle({ collapsed, side, width, onClick, labels }: {
  collapsed: boolean;
  side: 'left' | 'right';
  width: number;
  onClick: () => void;
  labels: [string, string];
}) {
  const rotation = side === 'left' ? (collapsed ? 0 : 180) : (collapsed ? 180 : 0);
  return (
    <button
      onClick={onClick}
      className="sidebar-toggle-btn"
      style={{ [side]: collapsed ? '12px' : `calc(${width}px - 14px)`, transition: `${side} 0.3s cubic-bezier(0.4,0,0.2,1)` }}
      title={collapsed ? labels[0] : labels[1]}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: `rotate(${rotation}deg)`, transition: 'transform 0.3s ease' }}>
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  );
}

function PaletteCategory({ categoryKey, items, onAdd, labelFor, descFor }: {
  categoryKey: CategoryKey;
  items: any[];
  onAdd: (item: any) => void;
  labelFor: (item: any) => string;
  descFor: (item: any) => string;
}) {
  const [open, setOpen] = useState(true);
  const [hoveredType, setHoveredType] = useState<string | null>(null);
  if (items.length === 0) return null;
  const { color, label } = CATEGORY_META[categoryKey];

  return (
    <div>
      <button onClick={() => setOpen((prev) => !prev)} style={{ ...PALETTE_HEADER_STYLE, marginBottom: open ? '0.5rem' : 0 }}>
        <span style={SIDEBAR_LABEL_STYLE}>
          {labelFor({ type: `category.${categoryKey}`, label })}
          <span style={{ marginLeft: '0.375rem', fontSize: '0.6rem', color: 'var(--color-text-dim)', fontWeight: 500 }}>({items.length})</span>
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '0.5rem' }}>
          {items.map((item) => {
            const labelText = labelFor(item);
            const descText = descFor(item);
            const isHovered = hoveredType === item.type;
            return (
              <div
                key={item.type}
                style={{
                  ...PALETTE_ITEM_STYLE,
                  position: 'relative',
                  padding: '0.375rem 0.5rem 0.375rem 0.75rem',
                  zIndex: isHovered ? 10 : 1,
                  background: isHovered ? 'var(--color-surface-hover)' : 'var(--color-surface-raised)',
                  borderColor: isHovered ? 'var(--color-primary)' : 'var(--color-surface-raised)',
                }}
                onMouseEnter={() => setHoveredType(item.type)}
                onMouseLeave={() => setHoveredType(null)}
              >
                <button
                  onClick={() => onAdd(item)}
                  title={descText}
                  style={{ flex: 1, minWidth: 0, minHeight: 30, padding: 0, background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', textAlign: 'left' }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{labelText}</span>
                </button>
                <span style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)' }}>
                  <InfoHint title={labelText} body={descText} detail={item.type} visible={isHovered} placement="right" panelWidth={236} />
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function PipelinesClient() {
  const { t } = useTranslation();
  const { sessionId, setSessionId } = useUploadStore();
  const { data: pipelines = [] } = useSWR('/api/pipelines', fetcher);
  const downloadedExportPathsRef = useRef<Set<string>>(new Set());

  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [pipelineName, setPipelineName] = useState('New Pipeline');
  const [activeTab, setActiveTab] = useState<PipelineTab>('editor');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);
  const [nodes, setNodes] = useState<PipelineNode[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [runLogs, setRunLogs] = useState<string[]>([]);
  const [runStatus, setRunStatus] = useState<string | null>(null);
  const [runDownloads, setRunDownloads] = useState<PipelineDownload[]>([]);
  const [runNotice, setRunNotice] = useState<string | null>(null);

  const selectedNode = useMemo(() => nodes.find((node) => node.id === selectedNodeId), [nodes, selectedNodeId]);
  const translateNode = useCallback((item: any, field: 'label' | 'desc') => {
    const value = t(`pipeline.node.${item.type.replace(/\./g, '_')}.${field}`);
    return value === `pipeline.node.${item.type.replace(/\./g, '_')}.${field}` ? item[field] : value;
  }, [t]);
  const filteredPalette = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const filter = (items: any[]) => items.filter((item) => translateNode(item, 'label').toLowerCase().includes(q) || translateNode(item, 'desc').toLowerCase().includes(q));
    return Object.fromEntries(CATEGORY_KEYS.map((key) => [key, filter(NODE_TYPES_PALETTE[key])])) as Record<CategoryKey, any[]>;
  }, [searchQuery, translateNode]);

  const resetPipeline = useCallback(() => {
    setSelectedPipelineId(null);
    setPipelineName('New Pipeline');
    setNodes([]);
    setEdges([]);
    setSelectedNodeId(null);
  }, []);

  useEffect(() => {
    if (pipelines.length > 0 && pipelineName === 'New Pipeline') setPipelineName(`New Pipeline ${pipelines.length + 1}`);
  }, [pipelines]);

  const handleNodeSelect = useCallback((id: string | null) => {
    setSelectedNodeId(id);
    if (id) {
      setIsRightCollapsed(false);
    }
  }, []);

  const addNodeToCanvas = useCallback((item: any) => {
    const id = `${item.type}_${Date.now()}`;
    setNodes((prev) => [...prev, { id, type: item.type, label: item.label, desc: item.desc, inputs: item.inputs, outputs: item.outputs, state: 'idle', disabled: false, config: { ...item.config } }]);
    setSelectedNodeId(id);
    setIsRightCollapsed(false);
  }, []);

  const deleteNodeById = useCallback((nodeId: string) => {
    setNodes((prev) => prev.filter((node) => node.id !== nodeId));
    setEdges((prev) => prev.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    setSelectedNodeId((current) => current === nodeId ? null : current);
  }, []);
  const deleteSelectedNode = useCallback(() => { if (selectedNodeId) deleteNodeById(selectedNodeId); }, [deleteNodeById, selectedNodeId]);
  const deleteEdgeById = useCallback((edgeId: string) => setEdges((prev) => prev.filter((edge) => edge.id !== edgeId)), []);
  const toggleNodeDisabled = useCallback((nodeId: string) => setNodes((prev) => prev.map((node) => node.id === nodeId ? { ...node, disabled: !node.disabled } : node)), []);
  const handlePositionChange = useCallback((id: string, position: { x: number; y: number }) => setNodes((prev) => prev.map((node) => node.id === id ? { ...node, position } : node)), []);
  const handleConfigChange = useCallback((key: string, value: any) => {
    setNodes((prev) => prev.map((node) => node.id === selectedNodeId ? { ...node, config: { ...node.config, [key]: value } } : node));
  }, [selectedNodeId]);
  const handleConnect = useCallback((sourceId: string, targetId: string) => {
    setEdges((prev) => prev.some((edge) => edge.source === sourceId && edge.target === targetId) ? prev : [...prev, { id: `edge_${sourceId}_${targetId}_${Date.now()}`, source: sourceId, target: targetId }]);
  }, []);

  const loadPipeline = async (id: string) => {
    try {
      const res = await fetch(`/api/pipelines/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      const def = JSON.parse(data.definition);
      const latestRun = data.runs?.[0];

      setSelectedPipelineId(data.id);
      setPipelineName(data.name);
      setNodes(applyNodeStates((def.nodes || []).map(normalizeNode), latestRun?.nodeStates));
      setEdges((def.edges || []).map(normalizeEdge));
      setSelectedNodeId(null);
      setRunLogs(latestRun?.logs ? latestRun.logs.split('\n') : []);
      setRunStatus(latestRun?.status || null);
      setActiveRunId(latestRun?.status === 'RUNNING' ? latestRun.id : null);
    } catch (err) {
      console.error('Failed to load pipeline', err);
    }
  };

  const savePipeline = async () => {
    const payload = { name: pipelineName, definition: JSON.stringify({ nodes: nodes.map(toLegacyNode), edges }) };
    const url = selectedPipelineId ? `/api/pipelines/${selectedPipelineId}` : '/api/pipelines';
    try {
      const res = await fetch(url, { method: selectedPipelineId ? 'PUT' : 'POST', headers: JSON_HEADERS, body: JSON.stringify(payload) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error(`Failed to save pipeline: ${err.error || res.statusText}`);
        return;
      }
      const saved = await res.json();
      if (!selectedPipelineId) setSelectedPipelineId(saved.id);
      mutate('/api/pipelines');
    } catch (err) {
      console.error('Error saving: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const deletePipeline = async () => {
    if (!selectedPipelineId || !confirm(`Are you sure you want to delete the pipeline "${pipelineName}"? This action cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/pipelines/${selectedPipelineId}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error(`Failed to delete pipeline: ${err.error || res.statusText}`);
        return;
      }
      resetPipeline();
      mutate('/api/pipelines');
    } catch (err) {
      console.error('Error deleting pipeline: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const downloadLogs = () => {
    downloadBlob(new Blob([runLogs.join('\n')], { type: 'text/plain;charset=utf-8' }), `pipeline_run_logs_${selectedPipelineId || 'new'}_${Date.now()}.txt`);
  };

  const runPipeline = async () => {
    if (!selectedPipelineId) {
      setRunNotice('Please save the pipeline before running it.');
      setRunLogs(['Error: Please save the pipeline before running it.']);
      setRunStatus('FAILED');
      return;
    }
    try {
      setRunNotice(null);
      downloadedExportPathsRef.current.clear();
      setRunDownloads([]);
      setRunLogs(['Queuing pipeline execution…']);
      setRunStatus('RUNNING');
      const res = await fetch(`/api/pipelines/${selectedPipelineId}/run`, { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ sessionId }) });
      if (!res.ok) {
        setRunStatus('FAILED');
        setRunLogs((prev) => [...prev, 'Failed to dispatch run']);
        return;
      }
      const run = await res.json();
      if (run.sessionId) setSessionId(run.sessionId);
      setActiveRunId(run.id);
      setRunLogs((prev) => [...prev, `Dispatched run ${run.id}`]);
    } catch {
      setRunStatus('FAILED');
      setRunLogs((prev) => [...prev, 'Connection error']);
    }
  };

  useEffect(() => {
    if (!activeRunId || runStatus !== 'RUNNING') return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/pipelines/runs/${activeRunId}`);
        if (!res.ok) return;
        const run = await res.json();
        const clientLogs = buildClientLogs(run);
        const downloads: PipelineDownload[] = Array.isArray(run.downloads) ? run.downloads : extractExportDownloads(clientLogs);

        setRunStatus(run.status);
        setRunLogs(clientLogs);
        setRunDownloads(downloads);
        if (run.status === 'COMPLETED' || run.status === 'FAILED') clearInterval(interval);
        if (run.status === 'COMPLETED') {
          const newDownloads = downloads.filter((download) => !downloadedExportPathsRef.current.has(download.path));
          newDownloads.forEach((download) => {
            downloadedExportPathsRef.current.add(download.path);
            downloadExportPath(download.path, download.fileName);
          });
        }
        const states = parseNodeStates(run.nodeStates);
        if (states) setNodes((prev) => prev.map((node) => states[node.id] ? { ...node, state: states[node.id].state } : node));
      } catch {}
    }, 2000);
    return () => clearInterval(interval);
  }, [activeRunId, runStatus]);

  const selectSavedPipeline = (value: string) => value ? loadPipeline(value) : resetPipeline();
  const selectedNodePayload = selectedNode && {
    id: selectedNode.id,
    data: {
      type: selectedNode.type,
      label: selectedNode.label,
      desc: selectedNode.desc,
      config: selectedNode.config,
      inputs: selectedNode.inputs,
      outputs: selectedNode.outputs,
      disabled: selectedNode.disabled,
    },
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)', fontFamily: 'var(--font-body)', overflow: 'hidden' }}>
      <Header />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative', minHeight: 0 }}>
        <aside className="collapsible-sidebar" style={makeSidebarStyle(isLeftCollapsed, 'left', 280)}>
          <div style={{ padding: '1.25rem 1.25rem 1rem', borderBottom: '1px solid var(--color-surface-raised)', flexShrink: 0 }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text)', margin: 0, fontFamily: 'var(--font-heading)' }}>{t('pipeline.title')}</h2>
            <input type="text" placeholder={t('pipeline.search')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ ...INPUT_STYLE, marginTop: '0.75rem' }} />
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {CATEGORY_KEYS.map((key) => (
              <PaletteCategory key={key} categoryKey={key} items={filteredPalette[key]} onAdd={addNodeToCanvas} labelFor={(item) => translateNode(item, 'label')} descFor={(item) => translateNode(item, 'desc')} />
            ))}
          </div>
          <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--color-surface-raised)', background: 'rgba(0,0,0,0.08)', flexShrink: 0 }}>
            <label style={SIDEBAR_LABEL_STYLE}>{t('pipeline.saved')}</label>
            <select value={selectedPipelineId || ''} onChange={(e) => selectSavedPipeline(e.target.value)} style={{ ...INPUT_STYLE, marginTop: '0.5rem' }}>
              <option value="">{t('pipeline.new')}</option>
              {pipelines.map((pipeline: any) => <option key={pipeline.id} value={pipeline.id}>{pipeline.name}</option>)}
            </select>
          </div>
        </aside>

        <SidebarToggle collapsed={isLeftCollapsed} side="left" width={280} onClick={() => setIsLeftCollapsed((prev) => !prev)} labels={['Expand palette', 'Collapse palette']} />

        <main style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          <div style={{ height: 52, borderBottom: '1px solid var(--color-surface-raised)', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.25rem', flexShrink: 0, zIndex: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input
                type="text"
                value={pipelineName}
                onChange={(e) => setPipelineName(e.target.value)}
                placeholder={t('pipeline.name')}
                style={{ background: 'var(--color-surface-input)', border: '1px solid var(--color-surface-raised)', borderRadius: 'var(--radius-sm)', padding: '0.25rem 0.625rem', fontWeight: 600, fontSize: '0.8125rem', color: 'var(--color-text)', outline: 'none', width: '180px', transition: 'border-color 0.12s ease' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-surface-raised)')}
              />
              {selectedPipelineId && <span style={{ fontSize: '0.6875rem', background: 'var(--color-surface-raised)', border: '1px solid var(--color-surface-hover)', padding: '0.125rem 0.5rem', borderRadius: 'var(--radius-sm)', color: 'var(--color-text-muted)' }}>#{selectedPipelineId.substring(0, 8)}</span>}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem', fontWeight: 600, borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', background: activeTab === tab ? 'var(--color-surface-hover)' : 'transparent', color: activeTab === tab ? 'var(--color-primary-hover)' : 'var(--color-text-muted)', transition: 'all 0.15s' }}
                >
                  {tab === 'editor' ? t('pipeline.canvas') : t('pipeline.logs')}
                </button>
              ))}
              <div style={{ width: 1, height: 14, background: 'var(--color-surface-raised)', margin: '0 0.25rem' }} />
              {runStatus && (
                <span style={{ marginRight: '0.25rem', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.6875rem', fontWeight: 700, background: runStatus === 'RUNNING' ? 'rgba(124,58,237,0.15)' : runStatus === 'COMPLETED' ? 'rgba(52,211,153,0.15)' : 'rgba(225,29,72,0.15)', color: runStatus === 'RUNNING' ? 'var(--color-primary-hover)' : runStatus === 'COMPLETED' ? '#34d399' : 'var(--color-error)' }}>{runStatus}</span>
              )}
              {selectedPipelineId && <Button variant="secondary" size="xs" onClick={deletePipeline} style={{ ...BUTTON_XS_STYLE, borderColor: 'var(--color-error)', color: 'var(--color-error)' }}>{t('pipeline.delete')}</Button>}
              <Button variant="secondary" size="xs" onClick={savePipeline} style={BUTTON_XS_STYLE}>{t('pipeline.save')}</Button>
              <Button variant="primary" size="xs" onClick={runPipeline} style={BUTTON_XS_STYLE}>{t('pipeline.run')}</Button>
            </div>
          </div>

          {runNotice && <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--color-surface-raised)', background: 'rgba(225,29,72,0.12)', color: 'var(--color-error)', fontSize: '0.75rem', fontWeight: 600 }}>{runNotice}</div>}

          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            {activeTab === 'editor' ? (
              <PipelineCytoCanvas
                nodes={nodes}
                edges={edges}
                selectedNodeId={selectedNodeId}
                onNodeSelect={handleNodeSelect}
                onConnect={handleConnect}
                onNodeDelete={deleteNodeById}
                onEdgeDelete={deleteEdgeById}
                onNodeToggleDisabled={toggleNodeDisabled}
                onPositionChange={handlePositionChange}
              />
            ) : (
              <div style={{ position: 'absolute', inset: 0, padding: '1.5rem', overflowY: 'auto', background: 'var(--bg-base)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--color-surface-raised)', paddingBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>{t('pipeline.console')}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {runLogs.length > 0 && <Button variant="secondary" size="xs" onClick={downloadLogs} style={BUTTON_XS_STYLE}>{t('pipeline.download_logs')}</Button>}
                    {runStatus && (
                      <span style={{ padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.6875rem', fontWeight: 700, background: runStatus === 'RUNNING' ? 'rgba(124,58,237,0.15)' : runStatus === 'COMPLETED' ? 'rgba(52,211,153,0.15)' : 'rgba(225,29,72,0.15)', color: runStatus === 'RUNNING' ? 'var(--color-primary-hover)' : runStatus === 'COMPLETED' ? '#34d399' : 'var(--color-error)' }}>{runStatus}</span>
                    )}
                  </div>
                </div>
                {runDownloads.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                    {runDownloads.map((download) => (
                      <Button key={download.path} variant="secondary" size="xs" onClick={() => downloadExportPath(download.path, download.fileName)} style={BUTTON_XS_STYLE}>Download {download.fileName}</Button>
                    ))}
                  </div>
                )}
                <div style={{ background: 'var(--color-surface-input)', border: '1px solid var(--color-surface-raised)', borderRadius: 'var(--radius)', padding: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', lineHeight: 1.6, color: 'var(--color-text)', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  {runLogs.length === 0
                    ? <p style={{ color: 'var(--color-text-dim)', fontStyle: 'italic', margin: 0 }}>{t('pipeline.no_logs')}</p>
                    : runLogs.map((log, index) => <div key={index} style={{ borderLeft: '2px solid var(--color-surface-hover)', paddingLeft: '0.75rem' }}>{log}</div>)
                  }
                </div>
              </div>
            )}
          </div>
        </main>

        <SidebarToggle collapsed={isRightCollapsed} side="right" width={320} onClick={() => setIsRightCollapsed((prev) => !prev)} labels={['Expand config', 'Collapse config']} />

        <aside className="collapsible-sidebar" style={makeSidebarStyle(isRightCollapsed, 'right', 320)}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-surface-raised)', flexShrink: 0 }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>{t('pipeline.node_config')}</h3>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
            {selectedNodePayload ? (
              <NodeConfigDrawer
                selectedNode={selectedNodePayload}
                selectedPipelineId={selectedPipelineId}
                handleConfigChange={handleConfigChange}
                handleLabelChange={(value) => setNodes((prev) => prev.map((node) => node.id === selectedNodeId ? { ...node, label: value } : node))}
                handleDeleteNode={deleteSelectedNode}
              />
            ) : (
              <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontStyle: 'italic', fontSize: '0.75rem', textAlign: 'center' }}>{t('pipeline.select_node')}</div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
