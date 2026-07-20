import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { Activity, Sliders, Layers, ZoomIn, ZoomOut, RefreshCw, Eye, Sparkles, Filter, Search, Info } from 'lucide-react';

interface EntityNodeData {
  id: string;
  label: string;
  type: 'PERSON' | 'ORG' | 'LOC' | 'EMAIL' | 'DATE';
  degree: number;
  occurrences: number;
  tfidf: number;
  isWeakSignal?: boolean;
  signalType?: 'Rare Bridge' | 'Niche Topic' | 'Spiking Signal';
  snippet?: string;
}

const INITIAL_NODES: EntityNodeData[] = [
  { id: '1', label: 'John Doe', type: 'PERSON', degree: 5, occurrences: 14, tfidf: 0.85, isWeakSignal: true, signalType: 'Rare Bridge', snippet: 'John Doe communicated with ACME Corp regarding project Alpha and sent emails to sarah@geode.science.' },
  { id: '2', label: 'ACME Corp', type: 'ORG', degree: 6, occurrences: 22, tfidf: 0.92, snippet: 'ACME Corp contracted GEODE Research Institute for data analysis in Paris.' },
  { id: '3', label: 'GEODE Research', type: 'ORG', degree: 4, occurrences: 18, tfidf: 0.78, snippet: 'GEODE Research Institute conducted geological entity extraction tests.' },
  { id: '4', label: 'Paris Office', type: 'LOC', degree: 3, occurrences: 9, tfidf: 0.64, snippet: 'Meetings were held at the Paris Office in June 2026.' },
  { id: '5', label: 'sarah@geode.science', type: 'EMAIL', degree: 4, occurrences: 11, tfidf: 0.73, isWeakSignal: true, signalType: 'Spiking Signal', snippet: 'Emails sent by sarah@geode.science showed a 300% frequency spike in week 3.' },
  { id: '6', label: 'Operation CyberPulse', type: 'ORG', degree: 3, occurrences: 7, tfidf: 0.89, isWeakSignal: true, signalType: 'Niche Topic', snippet: 'Operation CyberPulse was mentioned in only 2 confidential reports.' },
  { id: '7', label: 'Prof. Henri Laurent', type: 'PERSON', degree: 4, occurrences: 12, tfidf: 0.81, snippet: 'Prof. Henri Laurent authored the primary intelligence report.' },
  { id: '8', label: '2026-06-15', type: 'DATE', degree: 2, occurrences: 5, tfidf: 0.45, snippet: 'Document timestamp recorded on 2026-06-15.' },
  { id: '9', label: 'KuzuDB Engine', type: 'ORG', degree: 3, occurrences: 8, tfidf: 0.88, snippet: 'KuzuDB Engine executes high-performance Cypher graph queries.' },
  { id: '10', label: 'Alex Vance', type: 'PERSON', degree: 2, occurrences: 4, tfidf: 0.52, snippet: 'Alex Vance co-authored the session export specification.' },
];

const INITIAL_EDGES = [
  { source: '1', target: '2', weight: 8, snippet: 'John Doe & ACME Corp co-occurred in 8 document sections.' },
  { source: '1', target: '3', weight: 5, snippet: 'John Doe collaborated with GEODE Research.' },
  { source: '1', target: '5', weight: 7, snippet: 'John Doe exchanged emails with sarah@geode.science.' },
  { source: '2', target: '4', weight: 6, snippet: 'ACME Corp operates in Paris Office.' },
  { source: '2', target: '6', weight: 4, snippet: 'ACME Corp funded Operation CyberPulse.' },
  { source: '3', target: '7', weight: 9, snippet: 'GEODE Research is led by Prof. Henri Laurent.' },
  { source: '3', target: '9', weight: 6, snippet: 'GEODE Research integrates KuzuDB Engine.' },
  { source: '5', target: '7', weight: 4, snippet: 'sarah@geode.science reported to Prof. Henri Laurent.' },
  { source: '6', target: '8', weight: 3, snippet: 'Operation CyberPulse initiated on 2026-06-15.' },
  { source: '7', target: '10', weight: 2, snippet: 'Prof. Henri Laurent met Alex Vance.' },
];

export const InteractiveGraphSandbox: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  const [selectedNode, setSelectedNode] = useState<EntityNodeData | null>(INITIAL_NODES[0]);
  const [minDegree, setMinDegree] = useState<number>(1);
  const [minTfidf, setMinTfidf] = useState<number>(0.0);
  const [showWeakSignalsOnly, setShowWeakSignalsOnly] = useState<boolean>(false);
  const [layoutName, setLayoutName] = useState<string>('cose');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTypeFilters, setActiveTypeFilters] = useState<Record<string, boolean>>({
    PERSON: true,
    ORG: true,
    LOC: true,
    EMAIL: true,
    DATE: true,
  });

  const categoryColors: Record<string, string> = {
    PERSON: '#3b82f6', // blue
    ORG: '#a855f7',    // purple
    LOC: '#10b981',    // emerald
    EMAIL: '#f97316',  // orange
    DATE: '#64748b',   // slate
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // Convert data to Cytoscape elements
    const elements: cytoscape.ElementDefinition[] = [];

    INITIAL_NODES.forEach((n) => {
      elements.push({
        data: {
          id: n.id,
          label: n.label,
          type: n.type,
          degree: n.degree,
          occurrences: n.occurrences,
          tfidf: n.tfidf,
          isWeakSignal: n.isWeakSignal,
          signalType: n.signalType,
          snippet: n.snippet,
        },
      });
    });

    INITIAL_EDGES.forEach((e, idx) => {
      elements.push({
        data: {
          id: `e${idx}`,
          source: e.source,
          target: e.target,
          weight: e.weight,
          snippet: e.snippet,
        },
      });
    });

    const cy = cytoscape({
      container: containerRef.current,
      elements: elements,
      style: [
        {
          selector: 'node',
          style: {
            'label': 'data(label)',
            'color': '#f3f4f6',
            'font-size': '11px',
            'font-weight': 600,
            'text-valign': 'bottom',
            'text-margin-y': 5,
            'background-color': (node: any) => categoryColors[node.data('type')] || '#6366f1',
            'width': (node: any) => Math.max(24, Math.min(48, node.data('degree') * 6 + 18)),
            'height': (node: any) => Math.max(24, Math.min(48, node.data('degree') * 6 + 18)),
            'border-width': 2,
            'border-color': '#1f2937',
            'transition-property': 'background-color, border-color, width, height',
            'transition-duration': 0.2,
          },
        },
        {
          selector: 'node[?isWeakSignal]',
          style: {
            'border-width': 3,
            'border-style': 'dashed',
            'border-color': '#d946ef',
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 4,
            'border-color': '#fbbf24',
          },
        },
        {
          selector: 'edge',
          style: {
            'width': (edge: any) => Math.max(1.5, Math.min(6, edge.data('weight') * 0.6)),
            'line-color': '#374151',
            'curve-style': 'bezier',
            'opacity': 0.7,
          },
        },
        {
          selector: 'edge:selected',
          style: {
            'line-color': '#6366f1',
            'width': 4,
            'opacity': 1,
          },
        },
      ] as any[],
      layout: {
        name: layoutName,
        animate: true,
        animationDuration: 500,
      } as any,
    });

    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      setSelectedNode(node.data() as EntityNodeData);
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
    };
  }, []);

  // Handle filtering
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.nodes().forEach((node) => {
      const d = node.data();
      const passDegree = d.degree >= minDegree;
      const passTfidf = d.tfidf >= minTfidf;
      const passType = activeTypeFilters[d.type] !== false;
      const passWeak = !showWeakSignalsOnly || Boolean(d.isWeakSignal);
      const passSearch = !searchTerm || d.label.toLowerCase().includes(searchTerm.toLowerCase());

      if (passDegree && passTfidf && passType && passWeak && passSearch) {
        node.style('display', 'element');
      } else {
        node.style('display', 'none');
      }
    });

    cy.edges().forEach((edge) => {
      const source = edge.source();
      const target = edge.target();
      if (source.style('display') === 'element' && target.style('display') === 'element') {
        edge.style('display', 'element');
      } else {
        edge.style('display', 'none');
      }
    });
  }, [minDegree, minTfidf, activeTypeFilters, showWeakSignalsOnly, searchTerm]);

  // Handle layout change
  const handleLayoutChange = (name: string) => {
    setLayoutName(name);
    if (cyRef.current) {
      cyRef.current.layout({ name, animate: true, animationDuration: 400 } as any).run();
    }
  };

  return (
    <section id="graph-sandbox" className="py-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2">
              <Activity className="w-3.5 h-3.5" />
              Live Interactive Sandbox
            </div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              Cytoscape.js Entity Graph Explorer
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Test entity selection, filter thresholds, layout algorithms, and weak signal highlights in real-time.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleLayoutChange('cose')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                layoutName === 'cose' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300'
              }`}
            >
              Force (CoSE)
            </button>
            <button
              onClick={() => handleLayoutChange('circle')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                layoutName === 'circle' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300'
              }`}
            >
              Circle
            </button>
            <button
              onClick={() => handleLayoutChange('concentric')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                layoutName === 'concentric' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300'
              }`}
            >
              Concentric
            </button>
          </div>
        </div>

        {/* Graph Explorer Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Controls Sidebar (Left - 3 Cols) */}
          <div className="lg:col-span-3 glass-panel p-5 rounded-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <span className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-indigo-400" />
                Filter Sliders
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search entity..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Min Degree Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-300 font-medium">Min Connections</span>
                <span className="text-indigo-400 font-bold">{minDegree}</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={minDegree}
                onChange={(e) => setMinDegree(Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            {/* Min TF-IDF Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-300 font-medium">Min TF-IDF Score</span>
                <span className="text-indigo-400 font-bold">{minTfidf.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.8"
                step="0.05"
                value={minTfidf}
                onChange={(e) => setMinTfidf(Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            {/* Category Filters */}
            <div className="space-y-2 pt-2 border-t border-gray-800">
              <span className="text-xs font-semibold text-gray-400">Entity Types</span>
              <div className="space-y-1.5">
                {Object.keys(activeTypeFilters).map((type) => (
                  <label key={type} className="flex items-center justify-between text-xs text-gray-300 cursor-pointer hover:text-white">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: categoryColors[type] }} />
                      <span>{type}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={activeTypeFilters[type]}
                      onChange={(e) => setActiveTypeFilters({ ...activeTypeFilters, [type]: e.target.checked })}
                      className="accent-indigo-500 rounded cursor-pointer"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Weak Signals Toggle */}
            <div className="pt-2 border-t border-gray-800">
              <button
                onClick={() => setShowWeakSignalsOnly(!showWeakSignalsOnly)}
                className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                  showWeakSignalsOnly
                    ? 'bg-purple-600/30 border-purple-500 text-purple-200 neon-glow'
                    : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-gray-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Weak Signals Only</span>
              </button>
            </div>
          </div>

          {/* Canvas Area (Center - 6 Cols) */}
          <div className="lg:col-span-6 glass-panel rounded-2xl relative overflow-hidden border border-gray-800">
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-gray-900/80 px-3 py-1.5 rounded-lg border border-gray-800 text-[11px] text-gray-300 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Canvas Active (Cytoscape v3.30)</span>
            </div>

            {/* Zoom Control Overlay */}
            <div className="absolute top-4 right-4 z-10 flex items-center gap-1 bg-gray-900/80 p-1 rounded-lg border border-gray-800 backdrop-blur-md">
              <button
                onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 1.2)}
                className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-gray-800"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 0.8)}
                className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-gray-800"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => cyRef.current?.fit()}
                className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-gray-800"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Cytoscape Container */}
            <div ref={containerRef} className="w-full h-[480px] bg-[#0b0f19]/60 cursor-grab active:cursor-grabbing" />
          </div>

          {/* Inspector Drawer (Right - 3 Cols) */}
          <div className="lg:col-span-3 glass-panel p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <span className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-4 h-4 text-indigo-400" />
                Entity Inspector
              </span>
            </div>

            {selectedNode ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: categoryColors[selectedNode.type] }}
                    />
                    <span className="text-xs font-semibold text-gray-400 uppercase">
                      {selectedNode.type}
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-white mt-1">
                    {selectedNode.label}
                  </h4>
                </div>

                {selectedNode.isWeakSignal && (
                  <div className="px-3 py-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-semibold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span>{selectedNode.signalType}</span>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 py-2 border-y border-gray-800/80 text-center">
                  <div className="bg-gray-900/60 p-2 rounded-lg">
                    <div className="text-[10px] text-gray-400">Degree</div>
                    <div className="text-sm font-bold text-indigo-400">{selectedNode.degree}</div>
                  </div>
                  <div className="bg-gray-900/60 p-2 rounded-lg">
                    <div className="text-[10px] text-gray-400">Occurrences</div>
                    <div className="text-sm font-bold text-indigo-400">{selectedNode.occurrences}</div>
                  </div>
                  <div className="bg-gray-900/60 p-2 rounded-lg">
                    <div className="text-[10px] text-gray-400">TF-IDF</div>
                    <div className="text-sm font-bold text-indigo-400">{selectedNode.tfidf}</div>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-gray-300 mb-1">Text Snippet Context</div>
                  <div className="text-xs text-gray-400 bg-gray-900/80 p-3 rounded-xl border border-gray-800/80 leading-relaxed italic">
                    "{selectedNode.snippet || 'No excerpt context recorded for this node.'}"
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 text-xs">
                Click any node on the graph canvas to inspect attributes and occurrence snippets.
              </div>
            )}
          </div>

        </div>
      </div>
    </section>
  );
};
