import React from 'react';
import { FileUp, Cpu, Network, Shield, Cpu as CpuIcon, Workflow, Bot, Mail, CheckCircle2 } from 'lucide-react';

interface FeatureShowcaseProps {
  onSelectFeature: (featureId: string) => void;
}

export const FeatureShowcase: React.FC<FeatureShowcaseProps> = ({ onSelectFeature }) => {
  const features = [
    {
      id: 'ingestion',
      icon: FileUp,
      title: 'Multi-Format Ingestion & Queue',
      category: 'Ingestion Engine',
      description: 'Asynchronous document parsing supporting PDF, Word (.docx), PowerPoint (.pptx), Excel (.xlsx), EML/PST email archives, images, and plain text.',
      highlights: [
        'Automatic MIME type detection',
        'BullMQ / In-Memory job queueing',
        'Built-in Tesseract OCR for scans',
        'Batch upload progress monitoring'
      ],
      color: 'from-blue-500/20 via-indigo-500/10 to-transparent border-blue-500/30'
    },
    {
      id: 'nlp-extraction',
      icon: Cpu,
      title: 'spaCy 3.7 NLP Entity Extraction',
      category: 'Intelligence Engine',
      description: 'Powered by spaCy large language models for English, French, and Russian. Detects Persons, Organizations, Locations, Emails, Phone numbers, and Dates.',
      highlights: [
        'Multilingual model support (en, fr, ru)',
        'Contextual sliding sentence windows',
        'Entity canonicalization & deduplication',
        'Custom entity confidence scores'
      ],
      color: 'from-purple-500/20 via-pink-500/10 to-transparent border-purple-500/30'
    },
    {
      id: 'graph-canvas',
      icon: Network,
      title: 'Progressive Cytoscape.js Explorer',
      category: 'Visualization',
      description: 'High-performance interactive graph canvas handling up to 50,000 nodes using progressive batch loading and real-time layout engines.',
      highlights: [
        'TF-IDF & Degree filter sliders',
        'Double-click neighbor expansion',
        'Co-occurrence snippet highlighter',
        'Obsidian Vault & GraphML export'
      ],
      color: 'from-emerald-500/20 via-teal-500/10 to-transparent border-emerald-500/30'
    },
    {
      id: 'weak-signals',
      icon: CpuIcon,
      title: 'Weak Signals Discovery Engine',
      category: 'Analytics',
      description: 'Mathematical indicators designed to locate hidden structural brokers (Rare Bridges), localized topics (Niche Topics), and temporal activity bursts (Spiking Signals).',
      highlights: [
        'Betweenness centrality brokering ratio',
        'Localized TF-IDF salience scoring',
        '20% timeline sliding window bursts',
        'Neon pulsing canvas highlights'
      ],
      color: 'from-pink-500/20 via-rose-500/10 to-transparent border-pink-500/30'
    },
    {
      id: 'pipeline-builder',
      icon: Workflow,
      title: 'Visual Pipeline Builder',
      category: 'Automation',
      description: 'Visual DAG node canvas to compose custom graph workflows using sources, mathematical/AI filters, topological transforms, and export nodes.',
      highlights: [
        'Node editor palette & connections',
        'LLM graph node annotator',
        'Live execution progress logs',
        'Commit output to KuzuDB option'
      ],
      color: 'from-amber-500/20 via-orange-500/10 to-transparent border-amber-500/30'
    },
    {
      id: 'ai-reports',
      icon: Bot,
      title: 'AI Intelligence Reports',
      category: 'LLM Briefings',
      description: 'Generates structured analytical briefings from session entity networks using Mistral AI cloud models or local Ollama endpoints.',
      highlights: [
        'Threat Actor & Executive perspectives',
        'Strict zero-hallucination context prompts',
        'PDF & Markdown export capabilities',
        'Local Ollama / OpenAI API support'
      ],
      color: 'from-sky-500/20 via-blue-500/10 to-transparent border-sky-500/30'
    },
    {
      id: 'email-dashboard',
      icon: Mail,
      title: 'Structured Email Dashboard',
      category: 'Forensics',
      description: 'Dedicated table view for searching and filtering email archives (.eml, .pst) with structured sender/recipient metadata and body entity highlights.',
      highlights: [
        'From / To / CC header parsing',
        'Attachment entity extraction',
        'Timeline sort & keyword search',
        'Source document jump links'
      ],
      color: 'from-violet-500/20 via-purple-500/10 to-transparent border-violet-500/30'
    },
    {
      id: 'dual-db',
      icon: Shield,
      title: 'Dual Database Architecture',
      category: 'Infrastructure',
      description: 'Decoupled architecture pairing SQLite via Prisma for tabular session metadata with KuzuDB for ultra-fast Cypher graph traversals.',
      highlights: [
        'SQLite dev.db / production.db',
        'KuzuDB embedded C++ graph engine',
        'Zero external database install needed',
        'Clean session data purging'
      ],
      color: 'from-cyan-500/20 via-blue-500/10 to-transparent border-cyan-500/30'
    }
  ];

  return (
    <section id="features" className="py-20 bg-gray-950/60 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
            Capabilities Overview
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Comprehensive Feature Suite
          </h2>
          <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
            Hackmanite combines state-of-the-art Natural Language Processing, graph theory algorithms, and modern web UI components to empower document intelligence analysts.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.id}
                onClick={() => onSelectFeature(feat.id)}
                className={`glass-panel p-6 rounded-2xl cursor-pointer border bg-gradient-to-b ${feat.color} hover:scale-[1.02] transition-all group`}
              >
                <div className="w-12 h-12 rounded-xl bg-gray-900/80 border border-gray-800 flex items-center justify-center mb-4 group-hover:border-indigo-500/40 transition-colors">
                  <Icon className="w-6 h-6 text-indigo-400 group-hover:scale-110 transition-transform" />
                </div>
                
                <span className="text-[11px] font-semibold text-indigo-300 tracking-wider uppercase">
                  {feat.category}
                </span>
                
                <h3 className="text-lg font-bold text-white mt-1 group-hover:text-indigo-200 transition-colors">
                  {feat.title}
                </h3>
                
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                  {feat.description}
                </p>

                <ul className="mt-4 space-y-1.5 pt-4 border-t border-gray-800/60">
                  {feat.highlights.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-[11px] text-gray-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
