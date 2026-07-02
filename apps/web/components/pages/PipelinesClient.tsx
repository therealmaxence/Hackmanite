'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Header from '@/components/layout/Header';
import { useTranslation } from '@/lib/i18n';
import useSWR, { mutate } from 'swr';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import NodeConfigDrawer from '@/components/pipeline/NodeConfigDrawer';
import Button from '@/components/ui/Button';

// ─── Constants & Node Taxonomy ──────────────────────────────────────────────

const NODE_TYPES_PALETTE = {
  sources: [
    { type: 'source.sqlite.query', label: 'SQLite Query', desc: 'Raw SQL query against local SQLite tables', inputs: [], outputs: [{ id: 'output', type: 'tabular' }], config: { query: 'SELECT * FROM files LIMIT 10;' } },
    { type: 'source.file.document', label: 'Document File', desc: 'Ingest and process a single document file', inputs: [], outputs: [{ id: 'output', type: 'tabular' }], config: { filePath: '', mimeType: 'text/plain' } },
    { type: 'source.file.email', label: 'Email File', desc: 'EML/PST email format ingestion', inputs: [], outputs: [{ id: 'output', type: 'tabular' }], config: { filePath: '' } },
    { type: 'source.session', label: 'Active Session Graph', desc: 'Load graph data from a session', inputs: [], outputs: [{ id: 'output', type: 'graph' }], config: { sessionId: '' } },
    { type: 'source.kuzudb.query', label: 'KuzuDB Query', desc: 'Custom Cypher query against KuzuDB', inputs: [], outputs: [{ id: 'output', type: 'graph' }], config: { query: 'MATCH (a:Entity)-[r:CO_OCCURS]->(b:Entity) RETURN a, r, b LIMIT 50;' } },
  ],
  filters: [
    { type: 'filter.entity_category', label: 'Filter Category', desc: 'Filter entities by category', inputs: [{ id: 'input', type: 'graph' }], outputs: [{ id: 'output', type: 'graph' }], config: { types: ['PERSON', 'ORGANIZATION'] } },
    { type: 'filter.top_n_nodes', label: 'Top N Nodes', desc: 'Prune graph to top N nodes', inputs: [{ id: 'input', type: 'graph' }], outputs: [{ id: 'output', type: 'graph' }], config: { limit: 50, metric: 'tfidf' } },
    { type: 'filter.min_occurrences', label: 'Min Occurrences', desc: 'Filter by occurrence count', inputs: [{ id: 'input', type: 'graph' }], outputs: [{ id: 'output', type: 'graph' }], config: { min: 2 } },
    { type: 'filter.min_connections', label: 'Min Connections', desc: 'Filter by degree connections', inputs: [{ id: 'input', type: 'graph' }], outputs: [{ id: 'output', type: 'graph' }], config: { min: 2 } },
    { type: 'filter.edge_weight_threshold', label: 'Edge Weight', desc: 'Filter by connection weight', inputs: [{ id: 'input', type: 'graph' }], outputs: [{ id: 'output', type: 'graph' }], config: { min: 0.1 } },
    { type: 'filter.weak_signal_flag', label: 'Weak Signal Filter', desc: 'Keep only flagged signal entities', inputs: [{ id: 'input', type: 'graph' }], outputs: [{ id: 'output', type: 'graph' }], config: { rareBridges: true, nicheTopics: true, spikingSignals: true } },
    { type: 'filter.allow_deny_list', label: 'Denylist', desc: 'Filter out specific entity names', inputs: [{ id: 'input', type: 'graph' }], outputs: [{ id: 'output', type: 'graph' }], config: { deniedNames: '' } },
  ],
  transforms: [
    { type: 'transform.rare_bridges', label: 'Rare Bridges', desc: 'Identify bridge signals in graph', inputs: [{ id: 'input', type: 'graph' }], outputs: [{ id: 'output', type: 'graph' }], config: { maxOccurrence: 10 } },
    { type: 'transform.niche_topics', label: 'Niche Topics', desc: 'Isolate TF-IDF niche signals', inputs: [{ id: 'input', type: 'graph' }], outputs: [{ id: 'output', type: 'graph' }], config: { maxFiles: 2 } },
    { type: 'transform.spiking_signals', label: 'Spiking Signals', desc: 'Temporal signal concentration', inputs: [{ id: 'input', type: 'graph' }], outputs: [{ id: 'output', type: 'graph' }], config: { windowWidthRatio: 0.20, minConcentration: 0.60 } },
    { type: 'transform.llm_annotate', label: 'LLM Annotate', desc: 'Annotate nodes using AI', inputs: [{ id: 'input', type: 'graph' }], outputs: [{ id: 'output', type: 'graph' }], config: { provider: 'mistral', model: 'mistral-large-latest', prompt: 'Annotate this node.' } },
    { type: 'transform.community_detect', label: 'Community Detection', desc: 'Group modular communities', inputs: [{ id: 'input', type: 'graph' }], outputs: [{ id: 'output', type: 'graph' }], config: { iterations: 4 } },
    { type: 'transform.centrality_score', label: 'Centrality Score', desc: 'Calculate betweenness centrality', inputs: [{ id: 'input', type: 'graph' }], outputs: [{ id: 'output', type: 'graph' }], config: {} },
  ],
  outputs: [
    { type: 'output.obsidian_vault', label: 'Obsidian Export', desc: 'Generate Obsidian vault ZIP', inputs: [{ id: 'input', type: 'graph' }], outputs: [], config: { zipName: 'obsidian-export' } },
    { type: 'output.ai_report', label: 'AI Report', desc: 'Generate markdown analytical report', inputs: [{ id: 'input', type: 'graph' }], outputs: [{ id: 'output', type: 'tabular' }], config: { focusType: 'executive_summary', provider: 'mistral', model: 'mistral-large-latest', directives: '' } },
    { type: 'output.json', label: 'JSON Export', desc: 'Export datasets to JSON format', inputs: [{ id: 'input', type: 'graph' }], outputs: [], config: { fileName: 'export.json' } },
    { type: 'output.kuzudb_write', label: 'Commit to KuzuDB', desc: 'Write changes back to graph database', inputs: [{ id: 'input', type: 'graph' }], outputs: [], config: { confirmCommit: false } },
  ]
};

// Flatten palette nodes for easier lookup
const ALL_PALETTE_NODES = Object.values(NODE_TYPES_PALETTE).flat();

// Fetcher for API calls
const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('API Error');
  return res.json();
});

// ─── Custom React Flow Node Component ────────────────────────────────────────

const CustomPipelineNode = ({ data, selected }: { data: any; selected: boolean }) => {
  const isSource = data.type.startsWith('source.');
  const isFilter = data.type.startsWith('filter.');
  const isTransform = data.type.startsWith('transform.');
  const isOutput = data.type.startsWith('output.');

  let categoryLabel = 'Source';
  let categoryColor = '#00f0ff'; // cyan
  if (isFilter) {
    categoryLabel = 'Filter';
    categoryColor = '#34d399'; // mint green
  } else if (isTransform) {
    categoryLabel = 'Transform';
    categoryColor = '#a78bfa'; // lavender
  } else if (isOutput) {
    categoryLabel = 'Output';
    categoryColor = '#ff2a85'; // rose
  }

  // Node states styles
  const runState = data.state || 'idle'; // idle, running, success, error
  let stateIndicator = null;
  if (runState === 'running') {
    stateIndicator = (
      <span style={{ display: 'flex', width: 8, height: 8, position: 'relative' }}>
        <span style={{ position: 'absolute', display: 'inline-flex', width: '100%', height: '100%', borderRadius: '50%', background: 'var(--color-primary)', opacity: 0.75, animation: 'ping 1.2s cubic-bezier(0, 0, 0.2, 1) infinite' }} />
        <span style={{ position: 'relative', display: 'inline-flex', borderRadius: '50%', width: 8, height: 8, background: 'var(--color-primary)' }} />
      </span>
    );
  } else if (runState === 'success') {
    stateIndicator = <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-success)' }} title="Success" />;
  } else if (runState === 'error') {
    stateIndicator = <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-error)' }} title="Error" />;
  }

  const inputs = data.inputs || [];
  const outputs = data.outputs || [];

  return (
    <div
      style={{
        background: 'var(--color-surface-raised)',
        borderRadius: 'var(--radius)',
        border: selected ? '2px solid var(--color-primary)' : '1px solid var(--color-surface-hover)',
        boxShadow: selected ? 'var(--glow-leger)' : 'none',
        padding: '1rem',
        color: 'var(--color-text)',
        minWidth: '220px',
        transition: 'all 0.15s ease-in-out',
        fontFamily: 'var(--font-body)',
        position: 'relative',
      }}
    >
      {/* Input handles on the left */}
      {inputs.map((input: any, index: number) => {
        const top = `${((index + 1) / (inputs.length + 1)) * 100}%`;
        const handleBg = input.type === 'graph' ? '#a78bfa' : '#00f0ff';
        return (
          <Handle
            key={input.id}
            type="target"
            position={Position.Left}
            id={input.id}
            style={{ top, background: 'transparent', border: 'none', width: '12px', height: '12px' }}
            title={`Input Type: ${input.type}`}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: handleBg,
                marginLeft: -5,
                border: '1.5px solid var(--color-surface-raised)',
                boxShadow: `0 0 6px ${handleBg}`,
                transition: 'transform 0.1s ease',
              }}
            />
          </Handle>
        );
      })}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'between', gap: '0.5rem', marginBottom: '0.25rem' }}>
        <span
          style={{
            fontSize: '0.6875rem',
            textTransform: 'uppercase',
            fontWeight: 700,
            letterSpacing: '0.05em',
            color: categoryColor,
          }}
        >
          {categoryLabel}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginLeft: 'auto' }}>
          {stateIndicator}
          <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
            #{data.id.substring(0, 4)}
          </span>
        </div>
      </div>

      <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)', margin: '0.125rem 0', lineHeight: 1.3 }}>
        {data.label}
      </h3>
      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {data.desc}
      </p>

      {/* Output handles on the right */}
      {outputs.map((output: any, index: number) => {
        const top = `${((index + 1) / (outputs.length + 1)) * 100}%`;
        const handleBg = output.type === 'graph' ? '#a78bfa' : '#00f0ff';
        return (
          <Handle
            key={output.id}
            type="source"
            position={Position.Right}
            id={output.id}
            style={{ top, background: 'transparent', border: 'none', width: '12px', height: '12px' }}
            title={`Output Type: ${output.type}`}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: handleBg,
                marginRight: -5,
                border: '1.5px solid var(--color-surface-raised)',
                boxShadow: `0 0 6px ${handleBg}`,
                transition: 'transform 0.1s ease',
              }}
            />
          </Handle>
        );
      })}
    </div>
  );
};

// ─── Main Client Component ───────────────────────────────────────────────────

export default function PipelinesClient() {
  const { t } = useTranslation();
  const { data: pipelines = [], error: loadError } = useSWR('/api/pipelines', fetcher);

  // Active states
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [pipelineName, setPipelineName] = useState<string>('New Pipeline');
  const [activeTab, setActiveTab] = useState<'editor' | 'runs'>('editor');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [runLogs, setRunLogs] = useState<string[]>([]);
  const [runStatus, setRunStatus] = useState<string | null>(null);

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Selected Node's config schema
  const selectedNode = useMemo(() => {
    return nodes.find((n) => n.id === selectedNodeId);
  }, [nodes, selectedNodeId]);

  // Handle flow connection
  const onConnect = useCallback((params: any) => {
    // Add custom arrow marker styling to connection edges
    const newEdge = {
      ...params,
      animated: true,
      style: { stroke: 'var(--color-primary-hover, #7c3aed)', strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: 'var(--color-primary-hover, #7c3aed)',
      },
    };
    setEdges((eds) => addEdge(newEdge, eds));
  }, [setEdges]);

  // Fetch pipeline detail on select
  const loadPipeline = async (id: string) => {
    try {
      const res = await fetch(`/api/pipelines/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setSelectedPipelineId(data.id);
      setPipelineName(data.name);

      const parsedDef = JSON.parse(data.definition);
      
      let loadedNodes = parsedDef.nodes || [];
      const latestRun = data.runs?.[0];
      if (latestRun && latestRun.nodeStates) {
        const states = typeof latestRun.nodeStates === 'string' 
          ? JSON.parse(latestRun.nodeStates) 
          : latestRun.nodeStates;
        loadedNodes = loadedNodes.map((n: any) => {
          const match = states[n.id];
          if (match) {
            return {
              ...n,
              data: {
                ...n.data,
                state: match.state,
                error: match.error,
              },
            };
          }
          return n;
        });
      }

      setNodes(loadedNodes);
      setEdges(parsedDef.edges || []);
      setSelectedNodeId(null);

      if (latestRun) {
        setRunLogs(latestRun.logs ? latestRun.logs.split('\n') : []);
        setRunStatus(latestRun.status);
        if (latestRun.status === 'RUNNING') {
          setActiveRunId(latestRun.id);
        }
      } else {
        setRunLogs([]);
        setRunStatus(null);
        setActiveRunId(null);
      }
    } catch (e) {
      console.error('Failed to load pipeline', e);
    }
  };

  // Add node from palette
  const addNodeToCanvas = (paletteItem: any) => {
    const id = `${paletteItem.type}_${Date.now()}`;
    const newNode = {
      id,
      type: 'customNode',
      position: { x: 150 + Math.random() * 80, y: 150 + Math.random() * 80 },
      data: {
        id,
        type: paletteItem.type,
        label: paletteItem.label,
        desc: paletteItem.desc,
        inputs: paletteItem.inputs,
        outputs: paletteItem.outputs,
        config: { ...paletteItem.config },
        state: 'idle',
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setSelectedNodeId(id);
  };

  // Delete node
  const deleteSelectedNode = () => {
    if (!selectedNodeId) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId(null);
  };

  // Save pipeline
  const savePipeline = async () => {
    const definition = JSON.stringify({ nodes, edges });
    const payload = { name: pipelineName, definition };

    try {
      let res;
      if (selectedPipelineId) {
        res = await fetch(`/api/pipelines/${selectedPipelineId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/pipelines', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        const saved = await res.json();
        if (!selectedPipelineId) {
          setSelectedPipelineId(saved.id);
        }
        mutate('/api/pipelines');
        alert('Pipeline saved successfully!');
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Failed to save pipeline: ${errorData.error || res.statusText || res.status}`);
      }
    } catch (e) {
      console.error(e);
      alert('Error saving pipeline: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  // Trigger running pipeline
  const runPipeline = async () => {
    if (!selectedPipelineId) {
      alert('Please save the pipeline before running.');
      return;
    }

    try {
      setRunLogs(['Queuing pipeline execution in BullMQ...']);
      setRunStatus('RUNNING');
      setActiveTab('runs');

      const res = await fetch(`/api/pipelines/${selectedPipelineId}/run`, {
        method: 'POST',
      });

      if (!res.ok) {
        setRunStatus('FAILED');
        setRunLogs((prev) => [...prev, 'Failed to dispatch pipeline run: Server returned error']);
        return;
      }

      const run = await res.json();
      setActiveRunId(run.id);
      setRunLogs((prev) => [...prev, `Pipeline run successfully dispatched (Run ID: ${run.id}).`, 'Waiting for progress updates...']);
    } catch (e) {
      setRunStatus('FAILED');
      setRunLogs((prev) => [...prev, 'Failed to dispatch pipeline run: Connection error']);
    }
  };

  // Simple SWR or interval polling for active runs
  useEffect(() => {
    if (!activeRunId || runStatus !== 'RUNNING') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/pipelines/runs/${activeRunId}`);
        if (!res.ok) return;
        const run = await res.json();

        setRunStatus(run.status);
        if (run.error) {
          setRunLogs((prev) => [...prev, `[ERROR] ${run.error}`]);
        }

        // Apply node updates if any streamed back from the backend
        if (run.nodeStates) {
          setNodes((nds) => nds.map((n) => {
            const nodeState = run.nodeStates[n.id];
            if (nodeState) {
              return { ...n, data: { ...n.data, state: nodeState.state } };
            }
            return n;
          }));
        }

        if (run.status === 'COMPLETED' || run.status === 'FAILED') {
          setRunLogs((prev) => [...prev, `Pipeline finished with status: ${run.status}`]);
          clearInterval(interval);
        }
      } catch (e) {
        console.error('Polling error', e);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [activeRunId, runStatus, setNodes]);

  // Handle configuration changes for selected node
  const handleConfigChange = (key: string, value: any) => {
    setNodes((nds) => nds.map((n) => {
      if (n.id === selectedNodeId) {
        return {
          ...n,
          data: {
            ...n.data,
            config: {
              ...n.data.config,
              [key]: value,
            },
          },
        };
      }
      return n;
    }));
  };

  // Node connection type check
  const isValidConnection = useCallback((connection: any) => {
    const sourceNode = nodes.find((n) => n.id === connection.source);
    const targetNode = nodes.find((n) => n.id === connection.target);
    if (!sourceNode || !targetNode) return false;

    const sourceOutput = sourceNode.data.outputs?.find((o: any) => o.id === connection.sourceHandle);
    const targetInput = targetNode.data.inputs?.find((i: any) => i.id === connection.targetHandle);
    if (!sourceOutput || !targetInput) return false;

    // Check type matching
    return sourceOutput.type === targetInput.type;
  }, [nodes]);

  const nodeTypes = useMemo(() => ({ customNode: CustomPipelineNode }), []);

  // Filter palette items based on search
  const filteredPalette = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const filterGroup = (items: any[]) => items.filter((i) => i.label.toLowerCase().includes(query) || i.desc.toLowerCase().includes(query));

    return {
      sources: filterGroup(NODE_TYPES_PALETTE.sources),
      filters: filterGroup(NODE_TYPES_PALETTE.filters),
      transforms: filterGroup(NODE_TYPES_PALETTE.transforms),
      outputs: filterGroup(NODE_TYPES_PALETTE.outputs),
    };
  }, [searchQuery]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)', fontFamily: 'var(--font-body)', overflow: 'hidden' }}>
      <Header />

      {/* Main Studio layout */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        
        {/* Left Drawer: Node Palette */}
        <aside
          className="collapsible-sidebar"
          style={{
            width: isLeftCollapsed ? 0 : 300,
            minWidth: isLeftCollapsed ? 0 : 300,
            borderRight: isLeftCollapsed ? 'none' : '1px solid var(--color-surface-raised)',
            background: 'var(--color-surface)',
            zIndex: 10,
          }}
        >
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-surface-raised)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>Pipeline Studio</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem', lineHeight: 1.4 }}>Design pipelines to extract, filter and explore subgraphs.</p>
            <input
              type="text"
              placeholder="Search nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                marginTop: '1rem',
                padding: '0.625rem 0.75rem',
                fontSize: '0.8125rem',
                background: 'var(--color-surface-input)',
                border: '1px solid var(--color-surface-raised)',
                borderRadius: 'var(--radius-sm)',
                outline: 'none',
                color: 'var(--color-text)',
                transition: 'border-color 0.15s',
              }}
            />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', userSelect: 'none' }}>
            {/* Category: Sources */}
            {filteredPalette.sources.length > 0 && (
              <div>
                <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#00f0ff', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sources</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {filteredPalette.sources.map((item) => (
                    <div
                      key={item.type}
                      onClick={() => addNodeToCanvas(item)}
                      style={{
                        padding: '0.75rem 1rem',
                        background: 'var(--color-surface-raised)',
                        border: '1px solid transparent',
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer',
                        transition: 'all 0.12s ease-in-out',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--color-surface-hover)';
                        e.currentTarget.style.borderColor = '#00f0ff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--color-surface-raised)';
                        e.currentTarget.style.borderColor = 'transparent';
                      }}
                    >
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text)' }}>{item.label}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1.3 }}>{item.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Category: Filters */}
            {filteredPalette.filters.length > 0 && (
              <div>
                <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#34d399', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filters</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {filteredPalette.filters.map((item) => (
                    <div
                      key={item.type}
                      onClick={() => addNodeToCanvas(item)}
                      style={{
                        padding: '0.75rem 1rem',
                        background: 'var(--color-surface-raised)',
                        border: '1px solid transparent',
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer',
                        transition: 'all 0.12s ease-in-out',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--color-surface-hover)';
                        e.currentTarget.style.borderColor = '#34d399';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--color-surface-raised)';
                        e.currentTarget.style.borderColor = 'transparent';
                      }}
                    >
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text)' }}>{item.label}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1.3 }}>{item.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Category: Transforms */}
            {filteredPalette.transforms.length > 0 && (
              <div>
                <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a78bfa', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Transforms</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {filteredPalette.transforms.map((item) => (
                    <div
                      key={item.type}
                      onClick={() => addNodeToCanvas(item)}
                      style={{
                        padding: '0.75rem 1rem',
                        background: 'var(--color-surface-raised)',
                        border: '1px solid transparent',
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer',
                        transition: 'all 0.12s ease-in-out',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--color-surface-hover)';
                        e.currentTarget.style.borderColor = '#a78bfa';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--color-surface-raised)';
                        e.currentTarget.style.borderColor = 'transparent';
                      }}
                    >
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text)' }}>{item.label}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1.3 }}>{item.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Category: Outputs */}
            {filteredPalette.outputs.length > 0 && (
              <div>
                <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ff2a85', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Outputs</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {filteredPalette.outputs.map((item) => (
                    <div
                      key={item.type}
                      onClick={() => addNodeToCanvas(item)}
                      style={{
                        padding: '0.75rem 1rem',
                        background: 'var(--color-surface-raised)',
                        border: '1px solid transparent',
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer',
                        transition: 'all 0.12s ease-in-out',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--color-surface-hover)';
                        e.currentTarget.style.borderColor = '#ff2a85';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--color-surface-raised)';
                        e.currentTarget.style.borderColor = 'transparent';
                      }}
                    >
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text)' }}>{item.label}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1.3 }}>{item.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Pipelines Switcher Drawer Bottom */}
          <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--color-surface-raised)', background: 'rgba(0,0,0,0.1)' }}>
            <label style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Saved Pipelines</label>
            <select
              value={selectedPipelineId || ''}
              onChange={(e) => {
                const val = e.target.value;
                if (val) loadPipeline(val);
                else {
                  setSelectedPipelineId(null);
                  setPipelineName('New Pipeline');
                  setNodes([]);
                  setEdges([]);
                }
              }}
              style={{
                width: '100%',
                marginTop: '0.5rem',
                padding: '0.625rem 0.75rem',
                fontSize: '0.8125rem',
                background: 'var(--color-surface-input)',
                border: '1px solid var(--color-surface-raised)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-text)',
                outline: 'none',
              }}
            >
              <option value="">-- Start New Pipeline --</option>
              {pipelines.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </aside>

        {/* Left Sidebar Toggle Button */}
        <button
          onClick={() => setIsLeftCollapsed(!isLeftCollapsed)}
          className="sidebar-toggle-btn"
          style={{
            left: isLeftCollapsed ? '12px' : 'calc(300px - 14px)',
            transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.15s, color 0.15s, border-color 0.15s',
          }}
          title={isLeftCollapsed ? "Expand node palette" : "Collapse node palette"}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: isLeftCollapsed ? 'rotate(0deg)' : 'rotate(180deg)',
              transition: 'transform 0.3s ease',
            }}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        {/* Center Visual Canvas (ReactFlow Area) */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', height: '100%' }}>
          {/* Header Controls */}
          <div style={{ height: '56px', borderBottom: '1px solid var(--color-surface-raised)', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem', zIndex: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input
                type="text"
                value={pipelineName}
                onChange={(e) => setPipelineName(e.target.value)}
                placeholder="Pipeline Name..."
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1.5px solid transparent',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  color: 'var(--color-text)',
                  outline: 'none',
                  padding: '0.25rem 0.125rem',
                  transition: 'border-color 0.15s',
                }}
                onFocus={(e) => e.currentTarget.style.borderBottomColor = 'var(--color-primary)'}
                onBlur={(e) => e.currentTarget.style.borderBottomColor = 'transparent'}
              />
              {selectedPipelineId && (
                <span style={{ fontSize: '0.6875rem', background: 'var(--color-surface-raised)', border: '1px solid var(--color-surface-hover)', padding: '0.125rem 0.5rem', borderRadius: 'var(--radius-sm)', color: 'var(--color-text-muted)' }}>
                  ID: {selectedPipelineId.substring(0, 8)}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={() => setActiveTab('editor')}
                style={{
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  background: activeTab === 'editor' ? 'var(--color-surface-hover)' : 'transparent',
                  color: activeTab === 'editor' ? 'var(--color-primary-hover)' : 'var(--color-text-muted)',
                }}
              >
                Canvas
              </button>
              <button
                onClick={() => setActiveTab('runs')}
                style={{
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  background: activeTab === 'runs' ? 'var(--color-surface-hover)' : 'transparent',
                  color: activeTab === 'runs' ? 'var(--color-primary-hover)' : 'var(--color-text-muted)',
                }}
              >
                Run logs
              </button>

              <div style={{ width: '1px', height: '14px', background: 'var(--color-surface-raised)', margin: '0 0.5rem' }} />

              <Button
                variant="secondary"
                size="xs"
                onClick={savePipeline}
                style={{ minHeight: '30px', padding: '0 1rem' }}
              >
                Save
              </Button>
              <Button
                variant="primary"
                size="xs"
                onClick={runPipeline}
                style={{ minHeight: '30px', padding: '0 1rem' }}
              >
                Run Pipeline
              </Button>
            </div>
          </div>

          <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%', background: 'var(--bg-base)' }}>
            {activeTab === 'editor' ? (
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={(_e, node) => setSelectedNodeId(node.id)}
                nodeTypes={nodeTypes}
                isValidConnection={isValidConnection}
                fitView
                style={{ width: '100%', height: '100%' }}
              >
                <Controls style={{ background: 'var(--color-surface-raised)', border: 'none', borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: 'none' }} />
                <MiniMap style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius)', border: 'none' }} nodeColor="#18171c" maskColor="rgba(10, 9, 12, 0.6)" />
                <Background color="rgba(124, 58, 237, 0.05)" gap={16} />
              </ReactFlow>
            ) : (
              /* Execution Log Panel */
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)', position: 'absolute', inset: 0, overflowY: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--color-surface-raised)', paddingBottom: '0.75rem' }}>
                  <div>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>Execution Runs Console</h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0, marginTop: '0.125rem' }}>Stream progress and run records for this pipeline</p>
                  </div>
                  {runStatus && (
                    <span
                      style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        background: runStatus === 'RUNNING' ? 'rgba(124, 58, 237, 0.15)' : runStatus === 'COMPLETED' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(225, 29, 72, 0.15)',
                        color: runStatus === 'RUNNING' ? 'var(--color-primary-hover)' : runStatus === 'COMPLETED' ? '#34d399' : 'var(--color-error)',
                      }}
                    >
                      {runStatus}
                    </span>
                  )}
                </div>

                <div style={{ flex: 1, background: 'var(--color-surface-input)', border: '1px solid var(--color-surface-raised)', borderRadius: 'var(--radius)', padding: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', lineHeight: 1.6, color: 'var(--color-text)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  {runLogs.length === 0 ? (
                    <p style={{ color: 'var(--color-text-dim)', fontStyle: 'italic', margin: 0 }}>No execution logs yet. Click &apos;Run Pipeline&apos; to begin.</p>
                  ) : (
                    runLogs.map((log, idx) => (
                      <div key={idx} style={{ borderLeft: '2px solid var(--color-surface-hover)', paddingLeft: '0.75rem', paddingTop: '0.125rem', paddingBottom: '0.125rem' }}>
                        <span style={{ color: 'var(--color-text-dim)', marginRight: '0.5rem' }}>[{new Date().toLocaleTimeString()}]</span>
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Right Sidebar Toggle Button */}
        <button
          onClick={() => setIsRightCollapsed(!isRightCollapsed)}
          className="sidebar-toggle-btn"
          style={{
            right: isRightCollapsed ? '12px' : 'calc(320px - 14px)',
            transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.15s, color 0.15s, border-color 0.15s',
          }}
          title={isRightCollapsed ? "Expand config panel" : "Collapse config panel"}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: isRightCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s ease',
            }}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        {/* Right Drawer: Properties Config Panel */}
        <aside
          className="collapsible-sidebar"
          style={{
            width: isRightCollapsed ? 0 : 320,
            minWidth: isRightCollapsed ? 0 : 320,
            borderLeft: isRightCollapsed ? 'none' : '1px solid var(--color-surface-raised)',
            background: 'var(--color-surface)',
            zIndex: 10,
          }}
        >
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-surface-raised)' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>Node Configuration</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0, marginTop: '0.125rem' }}>Configure inputs and parameters for the selected node.</p>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
            {selectedNode ? (
              <NodeConfigDrawer
                selectedNode={selectedNode}
                selectedPipelineId={selectedPipelineId}
                handleConfigChange={handleConfigChange}
                handleLabelChange={(val) => {
                  setNodes((nds) => nds.map((n) => (n.id === selectedNodeId ? { ...n, data: { ...n.data, label: val } } : n)));
                }}
                handleDeleteNode={deleteSelectedNode}
              />
            ) : (
              <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontStyle: 'italic', fontSize: '0.75rem', textAlign: 'center', padding: '1rem' }}>
                No node selected. Click a node on the canvas to configure it.
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
