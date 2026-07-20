import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { Sliders, Search, ZoomIn, ZoomOut, RefreshCw, Sparkles, Info, ChevronLeft, ChevronRight, EyeOff, Layers, FileText } from 'lucide-react';

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
  { source: '1', target: '2', weight: 8 },
  { source: '1', target: '3', weight: 5 },
  { source: '1', target: '5', weight: 7 },
  { source: '2', target: '4', weight: 6 },
  { source: '2', target: '6', weight: 4 },
  { source: '3', target: '7', weight: 9 },
  { source: '3', target: '9', weight: 6 },
  { source: '5', target: '7', weight: 4 },
  { source: '6', target: '8', weight: 3 },
  { source: '7', target: '10', weight: 2 },
];

export const InteractiveGraphSandbox: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  const [selectedNode, setSelectedNode] = useState<EntityNodeData | null>(INITIAL_NODES[0]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [minDegree, setMinDegree] = useState<number>(1);
  const [minOccurrences, setMinOccurrences] = useState<number>(1);
  const [minTfidf, setMinTfidf] = useState<number>(0.0);
  const [showWeakSignalsOnly, setShowWeakSignalsOnly] = useState<boolean>(false);
  const [layoutName, setLayoutName] = useState<string>('cose');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loadedCount, setLoadedCount] = useState<number>(500);

  const categoryColors: Record<string, string> = {
    PERSON: '#3b82f6',
    ORG: '#a855f7',
    LOC: '#10b981',
    EMAIL: '#f97316',
    DATE: '#64748b',
  };

  useEffect(() => {
    if (!containerRef.current) return;

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
            'color': '#f8fafc',
            'font-size': '11px',
            'font-weight': 600,
            'text-valign': 'bottom',
            'text-margin-y': 6,
            'background-color': (node: any) => categoryColors[node.data('type')] || '#6366f1',
            'width': (node: any) => Math.max(26, Math.min(48, node.data('degree') * 5 + 18)),
            'height': (node: any) => Math.max(26, Math.min(48, node.data('degree') * 5 + 18)),
            'border-width': 2,
            'border-color': '#0f172a',
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
            'width': (edge: any) => Math.max(1.5, Math.min(5, edge.data('weight') * 0.5)),
            'line-color': '#334155',
            'curve-style': 'bezier',
            'opacity': 0.75,
          },
        },
      ] as any[],
      layout: {
        name: layoutName,
        animate: true,
        animationDuration: 400,
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

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.nodes().forEach((node) => {
      const d = node.data();
      const passDegree = d.degree >= minDegree;
      const passOccurrences = d.occurrences >= minOccurrences;
      const passTfidf = d.tfidf >= minTfidf;
      const passWeak = !showWeakSignalsOnly || Boolean(d.isWeakSignal);
      const passSearch = !searchTerm || d.label.toLowerCase().includes(searchTerm.toLowerCase());

      if (passDegree && passOccurrences && passTfidf && passWeak && passSearch) {
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
  }, [minDegree, minOccurrences, minTfidf, showWeakSignalsOnly, searchTerm]);

  const handleLayoutChange = (name: string) => {
    setLayoutName(name);
    if (cyRef.current) {
      cyRef.current.layout({ name, animate: true, animationDuration: 350 } as any).run();
    }
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] bg-slate-950 text-slate-100 flex flex-col font-sans overflow-hidden">
      
      {/* Top Controls Bar */}
      <div className="h-12 bg-slate-900 border-b border-slate-800/90 px-4 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center space-x-1"
          >
            {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            <span className="font-semibold text-[11px]">Filters Sidebar</span>
          </button>

          {/* Search */}
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search graph entity..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded pl-8 pr-2 py-1 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Layout Selectors & Zoom */}
        <div className="flex items-center space-x-2">
          <span className="text-slate-400 font-semibold text-[11px]">Layout:</span>
          {['cose', 'circle', 'concentric'].map((l) => (
            <button
              key={l}
              onClick={() => handleLayoutChange(l)}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition-all ${
                layoutName === l ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}
            >
              {l === 'cose' ? 'CoSE Force' : l === 'circle' ? 'Circle' : 'Concentric'}
            </button>
          ))}

          <div className="h-4 w-px bg-slate-800 mx-1" />

          <button onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 1.2)} className="p-1 rounded hover:bg-slate-800 text-slate-400">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 0.8)} className="p-1 rounded hover:bg-slate-800 text-slate-400">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button onClick={() => cyRef.current?.fit()} className="p-1 rounded hover:bg-slate-800 text-slate-400">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Canvas Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left Collapsible Controls Sidebar (Width 360px) */}
        {!isSidebarCollapsed && (
          <div className="w-[340px] bg-slate-900 border-r border-slate-800 p-5 space-y-5 overflow-y-auto text-xs">
            <div className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center space-x-2 border-b border-slate-800 pb-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>Graph Controls & Sliders</span>
            </div>

            {/* TF-IDF Relevance Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-300 font-medium">TF-IDF Relevance Cutoff</span>
                <span className="font-mono text-indigo-400 font-bold">{minTfidf.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.8"
                step="0.05"
                value={minTfidf}
                onChange={(e) => setMinTfidf(Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer h-1 bg-slate-800 rounded"
              />
            </div>

            {/* Min Occurrences Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-300 font-medium">Min Occurrences</span>
                <span className="font-mono text-indigo-400 font-bold">{minOccurrences}</span>
              </div>
              <input
                type="range"
                min="1"
                max="15"
                value={minOccurrences}
                onChange={(e) => setMinOccurrences(Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer h-1 bg-slate-800 rounded"
              />
            </div>

            {/* Min Connections (Degree) Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-300 font-medium">Min Connections (Degree)</span>
                <span className="font-mono text-indigo-400 font-bold">{minDegree}</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={minDegree}
                onChange={(e) => setMinDegree(Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer h-1 bg-slate-800 rounded"
              />
            </div>

            {/* Weak Signals Filter Toggle */}
            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowWeakSignalsOnly(!showWeakSignalsOnly)}
                className={`w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                  showWeakSignalsOnly
                    ? 'bg-purple-600/30 border-purple-500 text-purple-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Weak Signals Overlay</span>
              </button>
            </div>
          </div>
        )}

        {/* Center Cytoscape Canvas */}
        <div className="flex-1 bg-slate-950 relative">
          <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
        </div>

        {/* Right Entity Inspector Panel */}
        {selectedNode && (
          <div className="w-[320px] bg-slate-900 border-l border-slate-800 p-5 space-y-4 text-xs overflow-y-auto">
            <div className="font-bold text-slate-200 uppercase tracking-wider text-[11px] border-b border-slate-800 pb-2 flex items-center space-x-2">
              <Info className="w-4 h-4 text-indigo-400" />
              <span>Entity Inspector</span>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: categoryColors[selectedNode.type] }} />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{selectedNode.type}</span>
              </div>
              <h3 className="text-base font-bold text-white mt-1">{selectedNode.label}</h3>
            </div>

            {selectedNode.isWeakSignal && (
              <div className="px-3 py-1.5 rounded bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-semibold flex items-center space-x-2">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>{selectedNode.signalType}</span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-800 text-center font-mono">
              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <div className="text-[10px] text-slate-400">Degree</div>
                <div className="text-sm font-bold text-indigo-400">{selectedNode.degree}</div>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <div className="text-[10px] text-slate-400">Occurrences</div>
                <div className="text-sm font-bold text-indigo-400">{selectedNode.occurrences}</div>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <div className="text-[10px] text-slate-400">TF-IDF</div>
                <div className="text-sm font-bold text-indigo-400">{selectedNode.tfidf}</div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                <span>Text Snippet Evidence</span>
              </div>
              <div className="text-xs text-slate-300 bg-slate-950 p-3 rounded border border-slate-800 leading-relaxed italic">
                "{selectedNode.snippet || 'No snippet context available.'}"
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Bottom Legend Bar & Progressive Loader */}
      <div className="h-10 bg-slate-900 border-t border-slate-800 px-4 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center space-x-4">
          <span className="font-semibold text-slate-300">Legend:</span>
          {Object.keys(categoryColors).map((cat) => (
            <div key={cat} className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: categoryColors[cat] }} />
              <span className="text-[11px]">{cat}</span>
            </div>
          ))}
        </div>

        {/* Progressive Loader Bar */}
        <div className="flex items-center space-x-3 font-mono">
          <input
            type="range"
            min={1}
            max={12000}
            value={loadedCount}
            onChange={(e) => setLoadedCount(Number(e.target.value))}
            className="w-28 h-1 bg-slate-800 rounded accent-indigo-500 cursor-pointer"
          />
          <span className="text-indigo-400 font-semibold">{loadedCount}</span>
          <span className="text-slate-500">/ 12,000 nodes loaded</span>
          <button
            onClick={() => setLoadedCount(Math.min(12000, loadedCount + 500))}
            className="px-2 py-0.5 rounded border border-indigo-500 text-indigo-400 text-[10px] font-bold hover:bg-indigo-600 hover:text-white transition-colors"
          >
            Load More
          </button>
        </div>
      </div>

    </div>
  );
};
