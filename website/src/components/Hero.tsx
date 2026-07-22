import React from 'react';
import { Network, ArrowRight, ShieldCheck, Database, Cpu, FileText, Sparkles, Layers } from 'lucide-react';

interface HeroProps {
  onNavigate: (id: string) => void;
}

export const Hero: React.FC<HeroProps> = ({ onNavigate }) => {
  return (
    <section id="overview" className="relative pt-32 pb-20 overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-[350px] h-[350px] bg-purple-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[350px] h-[350px] bg-pink-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-4xl mx-auto space-y-6">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span>Interactive Wiki & Architecture Specification</span>
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            <span className="text-gray-400 font-normal">GEODE Collaboration</span>
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-none text-white">
            Uncover Hidden Entity Networks in{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
              Massive DataLakes
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-gray-300 max-w-3xl mx-auto font-normal leading-relaxed">
            <strong className="text-white font-semibold">Hackmanite</strong> is a high-performance desktop and web platform for extracting named entities (persons, organizations, locations, emails), computing co-occurrence networks, discovering weak signals, and orchestrating graph analysis workflows.
          </p>

          {/* Tech Pill Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {[
              { label: 'Electron v30 Desktop', icon: Layers, color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' },
              { label: 'Next.js 14 App Router', icon: Network, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
              { label: 'spaCy 3.7 NLP Pipeline', icon: Cpu, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
              { label: 'KuzuDB Embedded Graph DB', icon: Database, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
              { label: 'SQLite Prisma Relational DB', icon: FileText, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
              { label: 'Tesseract OCR', icon: ShieldCheck, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
            ].map((tech, i) => {
              const Icon = tech.icon;
              return (
                <span
                  key={i}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border ${tech.color}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tech.label}
                </span>
              );
            })}
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <button
              onClick={() => onNavigate('graph-sandbox')}
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all transform hover:-translate-y-0.5"
            >
              <span>Explore Interactive Graph Sandbox</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onNavigate('db-schema')}
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gray-900/80 hover:bg-gray-800/80 text-gray-200 border border-gray-700/60 font-semibold text-sm transition-all hover:text-white"
            >
              <Database className="w-4 h-4 text-indigo-400" />
              <span>Inspect Database Schema</span>
            </button>

            <button
              onClick={() => onNavigate('wiki')}
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gray-900/80 hover:bg-gray-800/80 text-gray-200 border border-gray-700/60 font-semibold text-sm transition-all hover:text-white"
            >
              <FileText className="w-4 h-4 text-purple-400" />
              <span>Full Wiki Documentation</span>
            </button>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 max-w-5xl mx-auto">
          {[
            { metric: '50,000+', label: 'Nodes Rendered in Batches', detail: 'Progressive Cytoscape.js loading' },
            { metric: 'Dual DB', label: 'SQLite + KuzuDB Engine', detail: 'Tabular metadata + Cypher traversals' },
            { metric: '3 Weak Signals', label: 'Mathematical Indicators', detail: 'Rare Bridges, Niche Topics, Spikes' },
            { metric: '100% Private', label: 'Local Offline Execution', detail: 'Zero external cloud tracking required' },
          ].map((item, idx) => (
            <div
              key={idx}
              className="glass-panel p-5 rounded-2xl text-center hover:border-indigo-500/30 transition-all"
            >
              <div className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-indigo-300 via-white to-purple-300 bg-clip-text text-transparent">
                {item.metric}
              </div>
              <div className="text-xs font-semibold text-gray-200 mt-1">
                {item.label}
              </div>
              <div className="text-[11px] text-gray-400 mt-0.5">
                {item.detail}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
