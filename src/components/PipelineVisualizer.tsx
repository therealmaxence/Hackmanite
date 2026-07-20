import React, { useState } from 'react';
import { Workflow, Play, CheckCircle2, ChevronRight, Sliders, Database, ArrowRight, Layers, FileText, Bot } from 'lucide-react';

interface PipelineNodeDef {
  id: string;
  name: string;
  category: 'Source' | 'Filter' | 'Transform' | 'Output';
  icon: any;
  color: string;
  description: string;
  parameters: string;
  inputFormat: string;
  outputFormat: string;
}

export const PipelineVisualizer: React.FC = () => {
  const [activeNodeId, setActiveNodeId] = useState<string>('source-1');
  const [isRunningSim, setIsRunningSim] = useState<boolean>(false);
  const [simStep, setSimStep] = useState<number>(0);

  const pipelineNodes: PipelineNodeDef[] = [
    {
      id: 'source-1',
      name: 'Active Session Graph',
      category: 'Source',
      icon: Database,
      color: 'from-blue-600 to-indigo-600 border-blue-500',
      description: 'Reads active session entity nodes and co-occurrences directly from KuzuDB & SQLite.',
      parameters: 'Session ID: Active, Fetch Excerpts: True',
      inputFormat: 'SQLite / KuzuDB Database',
      outputFormat: 'Graph Stream (12,450 nodes, 28,100 edges)'
    },
    {
      id: 'filter-1',
      name: 'Entity Category Filter',
      category: 'Filter',
      icon: Sliders,
      color: 'from-purple-600 to-pink-600 border-purple-500',
      description: 'Filters graph to include specified entity classifications (PERSON, ORG, LOC).',
      parameters: 'Allowed Types: [PERSON, ORG, LOC], Exclude: [DATE]',
      inputFormat: 'Graph Stream',
      outputFormat: 'Filtered Graph Stream (8,120 nodes)'
    },
    {
      id: 'transform-1',
      name: 'Rare Bridges Detector',
      category: 'Transform',
      icon: Workflow,
      color: 'from-pink-600 to-rose-600 border-pink-500',
      description: 'Computes betweenness centrality and structural brokering scores to isolate hidden connectors.',
      parameters: 'Min Betweenness: 0.12, Frequency Weighting: Inverse',
      inputFormat: 'Filtered Graph Stream',
      outputFormat: 'Annotated Graph Stream with Bridge Scores'
    },
    {
      id: 'transform-2',
      name: 'LLM Graph Annotator',
      category: 'Transform',
      icon: Bot,
      color: 'from-amber-600 to-orange-600 border-amber-500',
      description: 'Dispatches bounded graph neighborhoods to Mistral/Ollama to generate AI summary tags.',
      parameters: 'Model: mistral-large, Prompt: Annotate threat intelligence groups',
      inputFormat: 'Annotated Graph Stream',
      outputFormat: 'AI Enriched Knowledge Graph'
    },
    {
      id: 'output-1',
      name: 'Obsidian Vault Export',
      category: 'Output',
      icon: FileText,
      color: 'from-emerald-600 to-teal-600 border-emerald-500',
      description: 'Bundles processed entities and documents into a linked Markdown zip vault for Obsidian.',
      parameters: 'Vault Name: Session-Alpha-Vault, Embed Tags: True',
      inputFormat: 'AI Enriched Knowledge Graph',
      outputFormat: 'ZIP Archive (session-alpha-obsidian.zip)'
    }
  ];

  const currentNode = pipelineNodes.find((n) => n.id === activeNodeId) || pipelineNodes[0];

  const runSimulation = () => {
    if (isRunningSim) return;
    setIsRunningSim(true);
    setSimStep(0);

    let step = 0;
    const interval = setInterval(() => {
      step++;
      setSimStep(step);
      if (step >= pipelineNodes.length) {
        clearInterval(interval);
        setIsRunningSim(false);
      }
    }, 800);
  };

  return (
    <section id="pipeline" className="py-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-2">
              <Workflow className="w-3.5 h-3.5" />
              Automated Workflows
            </div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              Visual Pipeline Builder Canvas
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Compose reusable DAG graph workflows connecting data sources, mathematical filters, AI annotators, and output exporters.
            </p>
          </div>

          <button
            onClick={runSimulation}
            disabled={isRunningSim}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold text-xs shadow-lg hover:shadow-amber-500/30 transition-all disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>{isRunningSim ? `Executing Step ${simStep}/${pipelineNodes.length}...` : 'Simulate Pipeline Execution'}</span>
          </button>
        </div>

        {/* Visual Pipeline Canvas */}
        <div className="glass-panel p-8 rounded-3xl space-y-8 border border-gray-800">
          
          {/* Workflow DAG Node Track */}
          <div className="relative overflow-x-auto py-6">
            <div className="flex items-center gap-4 min-w-[900px] justify-between">
              {pipelineNodes.map((node, idx) => {
                const Icon = node.icon;
                const isSelected = node.id === activeNodeId;
                const isCompletedStep = isRunningSim && idx < simStep;
                const isActiveStep = isRunningSim && idx === simStep;

                return (
                  <React.Fragment key={node.id}>
                    <div
                      onClick={() => setActiveNodeId(node.id)}
                      className={`relative flex-1 p-5 rounded-2xl cursor-pointer border transition-all ${
                        isSelected
                          ? 'bg-gray-900 border-indigo-500 shadow-xl shadow-indigo-500/20 scale-105'
                          : 'bg-gray-900/60 border-gray-800 hover:border-gray-700'
                      } ${isActiveStep ? 'ring-2 ring-amber-400 animate-pulse' : ''}`}
                    >
                      {/* Category Badge */}
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-400">
                        {node.category}
                      </span>

                      <div className="flex items-center gap-3 mt-2">
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${node.color} flex items-center justify-center text-white shadow-md`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white leading-snug">
                            {node.name}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            Node #{idx + 1}
                          </div>
                        </div>
                      </div>

                      {/* Status indicator */}
                      {isCompletedStep && (
                        <div className="absolute top-3 right-3 text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    {/* Arrow connecting nodes */}
                    {idx < pipelineNodes.length - 1 && (
                      <div className="flex items-center text-gray-600 flex-shrink-0">
                        <ArrowRight className="w-5 h-5 text-gray-500" />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Selected Node Details Drawer */}
          <div className="bg-gray-900/80 p-6 rounded-2xl border border-gray-800 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                Node Specification
              </span>
              <h3 className="text-lg font-bold text-white mt-1">
                {currentNode.name}
              </h3>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                {currentNode.description}
              </p>
            </div>

            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Parameters & Config
              </span>
              <div className="bg-[#0b0f19] p-3 rounded-xl border border-gray-800/80 text-xs font-mono text-indigo-300 mt-2">
                {currentNode.parameters}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Data Stream Formats
              </span>
              <div className="mt-2 space-y-1.5 text-xs text-gray-300">
                <div className="flex justify-between">
                  <span className="text-gray-400">Input:</span>
                  <span className="font-semibold text-gray-200">{currentNode.inputFormat}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Output:</span>
                  <span className="font-semibold text-emerald-400">{currentNode.outputFormat}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
