'use client';

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Header from '@/components/layout/Header';
import { useTranslation } from '@/lib/i18n';
import useSWR, { mutate } from 'swr';
import NodeConfigDrawer from '@/components/pipeline/NodeConfigDrawer';
import Button from '@/components/ui/Button';
import { downloadBlob } from '@/lib/download';

// Lazy-load Cytoscape canvas (client-only)
const PipelineCytoCanvas = dynamic(
  () => import('@/components/pipeline/PipelineCytoCanvas'),
  { ssr: false, loading: () => <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>Loading canvas…</div> }
);

// ─── Constants & Node Taxonomy ───────────────────────────────────────────────

const CATEGORY_META = {
  sources:     { label: 'Sources',      color: '#00f0ff' },
  filters:     { label: 'Filters',      color: '#f59e0b' },
  transforms:  { label: 'Transforms',   color: '#a78bfa' },
  visualizers: { label: 'Visualizers',  color: '#fb923c' },
  outputs:     { label: 'Outputs',      color: '#ff2a85' },
} as const;

type CategoryKey = keyof typeof CATEGORY_META;
type PipelineDownload = { label: string; path: string; fileName: string };

const NODE_TYPES_PALETTE: Record<CategoryKey, any[]> = {
  sources: [
    { type: 'source.sqlite.query',   label: 'SQLite Query',         desc: 'Raw SQL query against local SQLite tables', inputs: [], outputs: [{ id: 'output', type: 'tabular' }], config: { query: 'SELECT * FROM files LIMIT 10;' } },
    { type: 'source.file.document',  label: 'Document File',        desc: 'Ingest and process a single document file', inputs: [], outputs: [{ id: 'output', type: 'graph' }],   config: { filePath: '', windowSize: 400 } },
    { type: 'source.file.email',     label: 'Email File',           desc: 'EML/PST email format ingestion',            inputs: [], outputs: [{ id: 'output', type: 'graph' }],   config: { filePath: '', windowSize: 400 } },
    { type: 'source.session',        label: 'Active Session Graph', desc: 'Load graph data from a session',            inputs: [], outputs: [{ id: 'output', type: 'graph' }],   config: { sessionId: '' } },
    { type: 'source.kuzudb.query',   label: 'KuzuDB Query',         desc: 'Custom Cypher query against KuzuDB',        inputs: [], outputs: [{ id: 'output', type: 'tabular' }], config: { query: 'MATCH (a:Entity)-[r:CO_OCCURS]->(b:Entity) RETURN a, r, b LIMIT 50;' } },
    { type: 'source.file.csv',       label: 'CSV Ingestor',         desc: 'Ingest tabular data from a CSV file',       inputs: [], outputs: [{ id: 'output', type: 'tabular' }], config: { filePath: '', delimiter: ',' } },
    { type: 'source.web.scraper',    label: 'Web Scraper',          desc: 'Ingest and run NLP extraction on web contents', inputs: [], outputs: [{ id: 'output', type: 'graph' }], config: { url: '' } },
  ],
  filters: [
    { type: 'filter.entity_category',    label: 'Filter Category',  desc: 'Filter entities by category',             inputs: [{ id: 'input', type: 'graph' }], outputs: [{ id: 'output', type: 'graph' }], config: { categories: ['PERSON', 'ORGANIZATION'] } },
    { type: 'filter.top_n_nodes',        label: 'Top N Nodes',      desc: 'Prune graph to top N nodes',              inputs: [{ id: 'input', type: 'graph' }], outputs: [{ id: 'output', type: 'graph' }], config: { limit: 50, metric: 'tfidf' } },
    { type: 'filter.min_tfidf',          label: 'Min TF-IDF',       desc: 'Filter entities below a TF-IDF threshold', inputs: [{ id: 'input', type: 'graph' }], outputs: [{ id: 'output', type: 'graph' }], config: { min: 1 } },
    { type: 'filter.min_occurrences',    label: 'Min Occurrences',  desc: 'Filter by occurrence count',              inputs: [{ id: 'input', type: 'graph' }], outputs: [{ id: 'output', type: 'graph' }], config: { min: 2 } },
    { type: 'filter.min_connections',    label: 'Min Connections',  desc: 'Filter by degree connections',            inputs: [{ id: 'input', type: 'graph' }], outputs: [{ id: 'output', type: 'graph' }], config: { min: 2 } },
    { type: 'filter.edge_weight_threshold', label: 'Edge Weight',   desc: 'Filter by connection weight',             inputs: [{ id: 'input', type: 'graph' }], outputs: [{ id: 'output', type: 'graph' }], config: { min: 0.1 } },
    { type: 'filter.weak_signal_flag',   label: 'Weak Signal',      desc: 'Keep only flagged signal entities',        inputs: [{ id: 'input', type: 'graph' }], outputs: [{ id: 'output', type: 'graph' }], config: { rareBridges: true, nicheTopics: true, spikingSignals: true } },
    { type: 'filter.allow_deny_list',    label: 'Denylist',         desc: 'Filter out specific entity names',         inputs: [{ id: 'input', type: 'graph' }], outputs: [{ id: 'output', type: 'graph' }], config: { deniedNames: '' } },
    { type: 'filter.date_range',         label: 'Date Range',       desc: 'Filter entities by date range',           inputs: [{ id: 'input', type: 'graph' }], outputs: [{ id: 'output', type: 'graph' }], config: { startDate: '', endDate: '' } },
  ],
  transforms: [
    { type: 'transform.rare_bridges',     label: 'Rare Bridges',        desc: 'Identify bridge signals in graph',       inputs: [{ id: 'input', type: 'graph' }], outputs: [{ id: 'output', type: 'graph' }], config: { maxOccurrence: 10 } },
    { type: 'transform.niche_topics',     label: 'Niche Topics',         desc: 'Isolate TF-IDF niche signals',           inputs: [{ id: 'input', type: 'graph' }], outputs: [{ id: 'output', type: 'graph' }], config: { maxFiles: 2 } },
    { type: 'transform.spiking_signals',  label: 'Spiking Signals',      desc: 'Temporal signal concentration',          inputs: [{ id: 'input', type: 'graph' }], outputs: [{ id: 'output', type: 'graph' }], config: { windowWidthRatio: 0.20, minConcentration: 0.60 } },
    { type: 'transform.llm_annotate',    label: 'LLM Annotate',         desc: 'Annotate nodes using AI',                inputs: [{ id: 'input', type: 'graph' }], outputs: [{ id: 'output', type: 'graph' }], config: { provider: 'mistral', model: 'mistral-large-latest', maxNodes: 80, prompt: 'Add a concise llmAnnotation metadata field to the most relevant nodes.' } },
    { type: 'transform.community_detect',label: 'Community Detection',  desc: 'Group modular communities',              inputs: [{ id: 'input', type: 'graph' }], outputs: [{ id: 'output', type: 'graph' }], config: { iterations: 4 } },
    { type: 'transform.centrality_score',label: 'Centrality Score',     desc: 'Calculate betweenness centrality',        inputs: [{ id: 'input', type: 'graph' }], outputs: [{ id: 'output', type: 'graph' }], config: {} },
    { type: 'transform.entity_resolver', label: 'Entity Resolver',     desc: 'Deduplicate similar entities',            inputs: [{ id: 'input', type: 'graph' }], outputs: [{ id: 'output', type: 'graph' }], config: { threshold: 0.85 } },
  ],
  visualizers: [
    { type: 'visualize.graph', label: 'Graph Preview', desc: 'Render the intermediate graph at this stage', inputs: [{ id: 'input', type: 'graph' }], outputs: [{ id: 'output', type: 'graph' }], config: {} },
    { type: 'visualize.table', label: 'Table Preview', desc: 'Preview tabular records as a spreadsheet table', inputs: [{ id: 'input', type: 'tabular' }], outputs: [{ id: 'output', type: 'tabular' }], config: {} },
    { type: 'visualize.timeline', label: 'Timeline Preview', desc: 'View temporal entity occurrence trends', inputs: [{ id: 'input', type: 'graph' }], outputs: [{ id: 'output', type: 'graph' }], config: {} },
  ],
  outputs: [
    { type: 'output.obsidian_vault', label: 'Obsidian Export',   desc: 'Generate Obsidian vault ZIP',             inputs: [{ id: 'input', type: 'graph' }], outputs: [], config: { zipName: 'obsidian-export', exportLocation: 'downloads', exportFolder: 'uploads/exports' } },
    { type: 'output.ai_report',      label: 'AI Report',          desc: 'Generate markdown analytical report',     inputs: [{ id: 'input', type: 'graph' }], outputs: [], config: { fileName: 'ai-report.md', exportLocation: 'downloads', exportFolder: 'uploads/exports', focusType: 'general', language: 'en', apiProvider: 'mistral', apiEndpoint: 'https://api.mistral.ai/v1', apiKey: '', model: 'mistral-large-latest', topEntitiesLimit: 30, topTfidfLimit: 30, bridgesLimit: 10, weakSignalsLimit: 10, includeBridgeSignals: true, includeNicheSignals: true, includeEmergingSignals: true, customInstructions: '' } },
    { type: 'output.graphml',        label: 'GraphML Export',      desc: 'Export dataset to GraphML format',       inputs: [{ id: 'input', type: 'graph' }], outputs: [], config: { fileName: 'export.graphml', exportLocation: 'downloads', exportFolder: 'uploads/exports' } },
    { type: 'output.json',           label: 'JSON Export',         desc: 'Export datasets to JSON format',         inputs: [{ id: 'input', type: 'graph' }], outputs: [], config: { fileName: 'export.json', exportLocation: 'downloads', exportFolder: 'uploads/exports' } },
    { type: 'output.kuzudb_write',   label: 'Commit to KuzuDB',   desc: 'Write changes back to graph database',    inputs: [{ id: 'input', type: 'graph' }], outputs: [], config: { confirmCommit: false } },
    { type: 'output.html_dashboard', label: 'HTML Dashboard',     desc: 'Generate standalone HTML dashboard',     inputs: [{ id: 'input', type: 'graph' }], outputs: [], config: { fileName: 'dashboard.html', exportLocation: 'downloads' } },
  ],
};

// ─── Fetcher ─────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error('API Error'); return r.json(); });

function extractExportDownloads(logs: string[]): PipelineDownload[] {
  const pattern = /Successfully wrote (JSON output|GraphML output|Obsidian vault|AI report|HTML Dashboard output) to: (.+)$/;
  return logs.flatMap((log) => {
    const match = log.match(pattern);
    if (!match?.[2]) return [];
    const path = match[2].trim();
    return [{ label: match[1], path, fileName: path.split(/[\\/]/).pop() || 'export.file' }];
  });
}

async function downloadExportPath(relativePath: string) {
  const link = document.createElement('a');
  link.href = `/api/pipelines/download?path=${encodeURIComponent(relativePath)}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

// ─── Collapsible Palette Category ────────────────────────────────────────────

function PaletteCategory({
  categoryKey,
  items,
  onAdd,
  labelFor,
  descFor,
}: {
  categoryKey: CategoryKey;
  items: any[];
  onAdd: (item: any) => void;
  labelFor: (item: any) => string;
  descFor: (item: any) => string;
}) {
  const [open, setOpen] = useState(true);
  const { color } = CATEGORY_META[categoryKey];
  if (items.length === 0) return null;

  return (
    <div>
      {/* Category header – click to toggle */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.5rem 0.25rem',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          marginBottom: open ? '0.5rem' : 0,
        }}
      >
        <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {labelFor({ type: `category.${categoryKey}`, label: CATEGORY_META[categoryKey].label })}
          <span style={{ marginLeft: '0.375rem', fontSize: '0.6rem', color: 'var(--color-text-dim)', fontWeight: 500 }}>
            ({items.length})
          </span>
        </span>
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="var(--color-text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', flexShrink: 0 }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Collapsible items */}
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '0.5rem' }}>
          {items.map((item) => (
            <button
              key={item.type}
              onClick={() => onAdd(item)}
              title={descFor(item)}
              style={{
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
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-surface-hover)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-primary)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-surface-raised)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-surface-raised)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: color }} />
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text)' }}>{labelFor(item)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main client component ────────────────────────────────────────────────────

export default function PipelinesClient() {
  const { t } = useTranslation();
  const tt = useCallback((key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  }, [t]);
  const { data: pipelines = [] } = useSWR('/api/pipelines', fetcher);
  const downloadedExportPathsRef = useRef<Set<string>>(new Set());

  // ── UI state ──
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [pipelineName, setPipelineName] = useState('New Pipeline');
  const [activeTab, setActiveTab] = useState<'editor' | 'runs'>('editor');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);

  // Auto-increment default pipeline name based on DB pipelines count
  useEffect(() => {
    if (pipelines && pipelines.length > 0 && pipelineName === 'New Pipeline') {
      setPipelineName(`New Pipeline ${pipelines.length + 1}`);
    }
  }, [pipelines]);

  // ── Pipeline / canvas state ──
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // ── Run state ──
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [runLogs, setRunLogs] = useState<string[]>([]);
  const [runStatus, setRunStatus] = useState<string | null>(null);
  const [runDownloads, setRunDownloads] = useState<PipelineDownload[]>([]);
  const [runNotice, setRunNotice] = useState<string | null>(null);

  // ── Selected node memo ──
  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedNodeId), [nodes, selectedNodeId]);
  const labelFor = useCallback((item: any) => tt(`pipeline.node.${item.type.replace(/\./g, '_')}.label`, item.label), [tt]);
  const descFor = useCallback((item: any) => tt(`pipeline.node.${item.type.replace(/\./g, '_')}.desc`, item.desc), [tt]);

  // ── Filtered palette ──
  const filteredPalette = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const f = (items: any[]) => items.filter((i) => labelFor(i).toLowerCase().includes(q) || descFor(i).toLowerCase().includes(q));
    return {
      sources:     f(NODE_TYPES_PALETTE.sources),
      filters:     f(NODE_TYPES_PALETTE.filters),
      transforms:  f(NODE_TYPES_PALETTE.transforms),
      visualizers: f(NODE_TYPES_PALETTE.visualizers),
      outputs:     f(NODE_TYPES_PALETTE.outputs),
    };
  }, [descFor, labelFor, searchQuery]);

  // ── Add node ──
  const addNodeToCanvas = useCallback((item: any) => {
    const id = `${item.type}_${Date.now()}`;
    setNodes((prev) => [
      ...prev,
      {
        id,
        type: item.type,
        label: item.label,
        desc: item.desc,
        inputs: item.inputs,
        outputs: item.outputs,
        state: 'idle',
        disabled: false,
        config: { ...item.config },
        // no position -> let the canvas layout place it
      },
    ]);
    setSelectedNodeId(id);
  }, []);

  // ── Delete selected node ──
  const deleteSelectedNode = useCallback(() => {
    if (!selectedNodeId) return;
    setNodes((ns) => ns.filter((n) => n.id !== selectedNodeId));
    setEdges((es) => es.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId(null);
  }, [selectedNodeId]);

  const deleteNodeById = useCallback((nodeId: string) => {
    setNodes((ns) => ns.filter((n) => n.id !== nodeId));
    setEdges((es) => es.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNodeId((current) => current === nodeId ? null : current);
  }, []);

  const deleteEdgeById = useCallback((edgeId: string) => {
    setEdges((es) => es.filter((e) => e.id !== edgeId));
  }, []);

  const toggleNodeDisabled = useCallback((nodeId: string) => {
    setNodes((ns) => ns.map((n) => n.id === nodeId ? { ...n, disabled: !n.disabled } : n));
  }, []);

  // ── Connect two nodes ──
  const handleConnect = useCallback((sourceId: string, targetId: string) => {
    const edgeId = `edge_${sourceId}_${targetId}_${Date.now()}`;
    setEdges((prev) => {
      if (prev.some((e) => e.source === sourceId && e.target === targetId)) return prev;
      return [...prev, { id: edgeId, source: sourceId, target: targetId }];
    });
  }, []);

  // ── Position change (after drag in cytoscape) ──
  const handlePositionChange = useCallback((id: string, position: { x: number; y: number }) => {
    setNodes((ns) => ns.map((n) => n.id === id ? { ...n, position } : n));
  }, []);

  // ── Config change ──
  const handleConfigChange = useCallback((key: string, value: any) => {
    setNodes((ns) => ns.map((n) =>
      n.id === selectedNodeId ? { ...n, config: { ...n.config, [key]: value } } : n
    ));
  }, [selectedNodeId]);

  // ── Load pipeline ──
  const loadPipeline = async (id: string) => {
    try {
      const res = await fetch(`/api/pipelines/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setSelectedPipelineId(data.id);
      setPipelineName(data.name);

      const def = JSON.parse(data.definition);
      let loadedNodes = (def.nodes || []).map((n: any) => ({
        id: n.id,
        type: n.data?.type || n.type,
        label: n.data?.label || n.label,
        desc: n.data?.desc || n.desc || '',
        state: n.data?.state || 'idle',
        config: n.data?.config || n.config || {},
        inputs: n.data?.inputs || n.inputs || [],
        outputs: n.data?.outputs || n.outputs || [],
        position: n.position,
        disabled: !!(n.data?.disabled ?? n.disabled),
      }));

      // Merge in latest run node states
      const latestRun = data.runs?.[0];
      if (latestRun?.nodeStates) {
        const states = typeof latestRun.nodeStates === 'string' ? JSON.parse(latestRun.nodeStates) : latestRun.nodeStates;
        loadedNodes = loadedNodes.map((n: any) => states[n.id] ? { ...n, state: states[n.id].state } : n);
      }

      // Convert ReactFlow edge format (source/target unchanged)
      const loadedEdges = (def.edges || []).map((e: any) => ({
        id: e.id,
        source: e.source,
        target: e.target,
      }));

      setNodes(loadedNodes);
      setEdges(loadedEdges);
      setSelectedNodeId(null);

      if (latestRun) {
        setRunLogs(latestRun.logs ? latestRun.logs.split('\n') : []);
        setRunStatus(latestRun.status);
        if (latestRun.status === 'RUNNING') setActiveRunId(latestRun.id);
      } else {
        setRunLogs([]);
        setRunStatus(null);
        setActiveRunId(null);
      }
    } catch (e) {
      console.error('Failed to load pipeline', e);
    }
  };

  // ── Save pipeline (store as same shape for back-compat) ──
  const savePipeline = async () => {
    // Map nodes back to legacy ReactFlow shape with .data wrapper for back-compat with executor.ts
    const legacyNodes = nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position || { x: 300, y: 300 },
      data: {
        type: n.type,
        label: n.label,
        desc: n.desc,
        config: n.config,
        inputs: n.inputs,
        outputs: n.outputs,
        state: n.state,
        disabled: !!n.disabled,
      }
    }));

    const definition = JSON.stringify({ nodes: legacyNodes, edges });
    const payload = { name: pipelineName, definition };

    try {
      let res;
      if (selectedPipelineId) {
        res = await fetch(`/api/pipelines/${selectedPipelineId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      } else {
        res = await fetch('/api/pipelines', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      }
      if (res.ok) {
        const saved = await res.json();
        if (!selectedPipelineId) setSelectedPipelineId(saved.id);
        mutate('/api/pipelines');
      } else {
        const err = await res.json().catch(() => ({}));
        console.error(`Failed to save pipeline: ${err.error || res.statusText}`);
      }
    } catch (e) {
      console.error('Error saving: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  // ── Delete pipeline ──
  const deletePipeline = async () => {
    if (!selectedPipelineId) return;
    if (!confirm(`Are you sure you want to delete the pipeline "${pipelineName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/pipelines/${selectedPipelineId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setSelectedPipelineId(null);
        setPipelineName('New Pipeline');
        setNodes([]);
        setEdges([]);
        mutate('/api/pipelines');
      } else {
        const err = await res.json().catch(() => ({}));
        console.error(`Failed to delete pipeline: ${err.error || res.statusText}`);
      }
    } catch (e) {
      console.error('Error deleting pipeline: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  // ── Download logs as txt ──
  const downloadLogs = () => {
    const text = runLogs.join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pipeline_run_logs_${selectedPipelineId || 'new'}_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ── Run pipeline ──
  const runPipeline = async () => {
    if (!selectedPipelineId) {
      setRunNotice('Please save the pipeline before running it.');
      setRunLogs(['Error: Please save the pipeline before running it.']);
      setRunStatus('FAILED');
      return;
    }
    try {
      setRunNotice(null);
      downloadedExportPathsRef.current = new Set();
      setRunDownloads([]);
      setRunLogs(['Queuing pipeline execution…']);
      setRunStatus('RUNNING');
      const res = await fetch(`/api/pipelines/${selectedPipelineId}/run`, { method: 'POST' });
      if (!res.ok) { setRunStatus('FAILED'); setRunLogs((p) => [...p, 'Failed to dispatch run']); return; }
      const run = await res.json();
      setActiveRunId(run.id);
      setRunLogs((p) => [...p, `Dispatched run ${run.id}`]);
    } catch {
      setRunStatus('FAILED');
      setRunLogs((p) => [...p, 'Connection error']);
    }
  };

  // ── Poll active run ──
  useEffect(() => {
    if (!activeRunId || runStatus !== 'RUNNING') return;
    const iv = setInterval(async () => {
      try {
        const res = await fetch(`/api/pipelines/runs/${activeRunId}`);
        if (!res.ok) return;
        const run = await res.json();
        setRunStatus(run.status);
        
        // Compile complete logs list including server logs
        const clientLogs = [
          'Queuing pipeline execution…',
          `Dispatched run ${run.id}`
        ];
        if (run.logs) {
          if (Array.isArray(run.logs)) {
            clientLogs.push(...run.logs);
          } else {
            clientLogs.push(...run.logs.split('\n'));
          }
        }
        if (run.error) {
          clientLogs.push(`[ERROR] ${run.error}`);
        }
        if (run.status === 'COMPLETED' || run.status === 'FAILED') {
          clientLogs.push(`Pipeline finished: ${run.status}`);
          clearInterval(iv);
        }
        setRunLogs(clientLogs);

        const downloads: PipelineDownload[] = Array.isArray(run.downloads) ? run.downloads : extractExportDownloads(clientLogs);
        setRunDownloads(downloads);

        if (run.status === 'COMPLETED' && downloads.length > 0) {
          const newDownloads = downloads.filter((download) => !downloadedExportPathsRef.current.has(download.path));
          if (newDownloads.length > 0) {
            newDownloads.forEach((download) => downloadedExportPathsRef.current.add(download.path));
            void Promise.all(
              newDownloads.map((download) => downloadExportPath(download.path).catch((err) => {
                console.error(`Failed to download export ${download.path}:`, err);
              }))
            );
          }
        }

        if (run.nodeStates) {
          const states = typeof run.nodeStates === 'string' ? JSON.parse(run.nodeStates) : run.nodeStates;
          setNodes((ns) => ns.map((n) => states[n.id] ? { ...n, state: states[n.id].state } : n));
        }
      } catch { /* ignore */ }
    }, 2000);
    return () => clearInterval(iv);
  }, [activeRunId, runStatus]);

  // ── Sidebar shared style ──
  const sidebarStyle = (collapsed: boolean, side: 'left' | 'right', width: number): React.CSSProperties => ({
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
  });

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)', fontFamily: 'var(--font-body)', overflow: 'hidden' }}>
      <Header />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative', minHeight: 0 }}>

        {/* ── Left Palette ── */}
        <aside className="collapsible-sidebar" style={sidebarStyle(isLeftCollapsed, 'left', 280)}>
          {/* Header + search */}
          <div style={{ padding: '1.25rem 1.25rem 1rem', borderBottom: '1px solid var(--color-surface-raised)', flexShrink: 0 }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text)', margin: 0, fontFamily: 'var(--font-heading)' }}>{t('pipeline.title')}</h2>
            <input
              type="text"
              placeholder={t('pipeline.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%', marginTop: '0.75rem', padding: '0.5rem 0.625rem',
                fontSize: '0.8125rem', background: 'var(--color-surface-input)',
                border: '1px solid var(--color-surface-raised)', borderRadius: 'var(--radius-sm)',
                outline: 'none', color: 'var(--color-text)',
              }}
            />
          </div>

          {/* Collapsible categories */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {(Object.keys(filteredPalette) as CategoryKey[]).map((key) => (
              <PaletteCategory
                key={key}
                categoryKey={key}
                items={filteredPalette[key]}
                onAdd={addNodeToCanvas}
                labelFor={labelFor}
                descFor={descFor}
              />
            ))}
          </div>

          {/* Saved pipelines switcher */}
          <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--color-surface-raised)', background: 'rgba(0,0,0,0.08)', flexShrink: 0 }}>
            <label style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t('pipeline.saved')}
            </label>
            <select
              value={selectedPipelineId || ''}
              onChange={(e) => {
                const v = e.target.value;
                if (v) loadPipeline(v);
                else { setSelectedPipelineId(null); setPipelineName('New Pipeline'); setNodes([]); setEdges([]); }
              }}
              style={{
                width: '100%', marginTop: '0.5rem', padding: '0.5rem 0.625rem',
                fontSize: '0.8125rem', background: 'var(--color-surface-input)',
                border: '1px solid var(--color-surface-raised)', borderRadius: 'var(--radius-sm)',
                color: 'var(--color-text)', outline: 'none',
              }}
            >
              <option value="">{t('pipeline.new')}</option>
              {pipelines.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </aside>

        {/* Left toggle btn */}
        <button
          onClick={() => setIsLeftCollapsed((c) => !c)}
          className="sidebar-toggle-btn"
          style={{ left: isLeftCollapsed ? '12px' : 'calc(280px - 14px)', transition: 'left 0.3s cubic-bezier(0.4,0,0.2,1)' }}
          title={isLeftCollapsed ? 'Expand palette' : 'Collapse palette'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: isLeftCollapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.3s ease' }}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        {/* ── Centre Canvas ── */}
        <main style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          {/* Toolbar */}
          <div style={{ height: 52, borderBottom: '1px solid var(--color-surface-raised)', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.25rem', flexShrink: 0, zIndex: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={pipelineName}
                  onChange={(e) => setPipelineName(e.target.value)}
                  placeholder={t('pipeline.name')}
                  style={{
                    background: 'var(--color-surface-input)',
                    border: '1px solid var(--color-surface-raised)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.25rem 0.625rem',
                    fontWeight: 600,
                    fontSize: '0.8125rem',
                    color: 'var(--color-text)',
                    outline: 'none',
                    width: '180px',
                    transition: 'border-color 0.12s ease',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-surface-raised)')}
                />
              </div>
              {selectedPipelineId && (
                <span style={{ fontSize: '0.6875rem', background: 'var(--color-surface-raised)', border: '1px solid var(--color-surface-hover)', padding: '0.125rem 0.5rem', borderRadius: 'var(--radius-sm)', color: 'var(--color-text-muted)' }}>
                  #{selectedPipelineId.substring(0, 8)}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              {(['editor', 'runs'] as const).map((tab) => (
                <button key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '0.375rem 0.75rem', fontSize: '0.75rem', fontWeight: 600,
                    borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
                    background: activeTab === tab ? 'var(--color-surface-hover)' : 'transparent',
                    color: activeTab === tab ? 'var(--color-primary-hover)' : 'var(--color-text-muted)',
                    transition: 'all 0.15s',
                  }}
                >
                  {tab === 'editor' ? t('pipeline.canvas') : t('pipeline.logs')}
                </button>
              ))}

              <div style={{ width: 1, height: 14, background: 'var(--color-surface-raised)', margin: '0 0.25rem' }} />

              {selectedPipelineId && (
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={deletePipeline}
                  style={{
                    minHeight: 30,
                    padding: '0 0.875rem',
                    borderColor: 'var(--color-error)',
                    color: 'var(--color-error)',
                  }}
                >
                  {t('pipeline.delete')}
                </Button>
              )}
              <Button variant="secondary" size="xs" onClick={savePipeline} style={{ minHeight: 30, padding: '0 0.875rem' }}>{t('pipeline.save')}</Button>
              <Button variant="primary"   size="xs" onClick={runPipeline}  style={{ minHeight: 30, padding: '0 0.875rem' }}>{t('pipeline.run')}</Button>
            </div>
          </div>
          {runNotice && (
            <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--color-surface-raised)', background: 'rgba(225,29,72,0.12)', color: 'var(--color-error)', fontSize: '0.75rem', fontWeight: 600 }}>
              {runNotice}
            </div>
          )}

          {/* Canvas or logs */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            {activeTab === 'editor' ? (
              <PipelineCytoCanvas
                nodes={nodes}
                edges={edges}
                selectedNodeId={selectedNodeId}
                onNodeSelect={setSelectedNodeId}
                onConnect={handleConnect}
                onNodeDelete={deleteNodeById}
                onEdgeDelete={deleteEdgeById}
                onNodeToggleDisabled={toggleNodeDisabled}
                onPositionChange={handlePositionChange}
              />
            ) : (
              <div style={{ position: 'absolute', inset: 0, padding: '1.5rem', overflowY: 'auto', background: 'var(--bg-base)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--color-surface-raised)', paddingBottom: '0.75rem' }}>
                  <div>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>{t('pipeline.console')}</h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {runLogs.length > 0 && (
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={downloadLogs}
                        style={{ minHeight: '30px', padding: '0 0.875rem' }}
                      >
                        {t('pipeline.download_logs')}
                      </Button>
                    )}
                    {runStatus && (
                      <span style={{
                        padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.6875rem', fontWeight: 700,
                        background: runStatus === 'RUNNING' ? 'rgba(124,58,237,0.15)' : runStatus === 'COMPLETED' ? 'rgba(52,211,153,0.15)' : 'rgba(225,29,72,0.15)',
                        color: runStatus === 'RUNNING' ? 'var(--color-primary-hover)' : runStatus === 'COMPLETED' ? '#34d399' : 'var(--color-error)',
                      }}>{runStatus}</span>
                    )}
                  </div>
                </div>
                {runDownloads.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                    {runDownloads.map((download) => (
                      <Button
                        key={download.path}
                        variant="secondary"
                        size="xs"
                        onClick={() => downloadExportPath(download.path)}
                        style={{ minHeight: '30px', padding: '0 0.875rem' }}
                      >
                        Download {download.fileName}
                      </Button>
                    ))}
                  </div>
                )}
                <div style={{ background: 'var(--color-surface-input)', border: '1px solid var(--color-surface-raised)', borderRadius: 'var(--radius)', padding: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', lineHeight: 1.6, color: 'var(--color-text)', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  {runLogs.length === 0
                    ? <p style={{ color: 'var(--color-text-dim)', fontStyle: 'italic', margin: 0 }}>{t('pipeline.no_logs')}</p>
                    : runLogs.map((log, i) => (
                      <div key={i} style={{ borderLeft: '2px solid var(--color-surface-hover)', paddingLeft: '0.75rem' }}>
                        {log}
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Right toggle btn */}
        <button
          onClick={() => setIsRightCollapsed((c) => !c)}
          className="sidebar-toggle-btn"
          style={{ right: isRightCollapsed ? '12px' : 'calc(320px - 14px)', transition: 'right 0.3s cubic-bezier(0.4,0,0.2,1)' }}
          title={isRightCollapsed ? 'Expand config' : 'Collapse config'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: isRightCollapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        {/* ── Right Config Drawer ── */}
        <aside className="collapsible-sidebar" style={sidebarStyle(isRightCollapsed, 'right', 320)}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-surface-raised)', flexShrink: 0 }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>{t('pipeline.node_config')}</h3>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
            {selectedNode ? (
              <NodeConfigDrawer
                selectedNode={{
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
                }}
                selectedPipelineId={selectedPipelineId}
                handleConfigChange={handleConfigChange}
                handleLabelChange={(val) => setNodes((ns) => ns.map((n) => n.id === selectedNodeId ? { ...n, label: val } : n))}
                handleDeleteNode={deleteSelectedNode}
              />
            ) : (
              <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontStyle: 'italic', fontSize: '0.75rem', textAlign: 'center' }}>
                {t('pipeline.select_node')}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
