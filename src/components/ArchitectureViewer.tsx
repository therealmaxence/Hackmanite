import React, { useState } from 'react';
import { Cpu, Layers, Server, Database, Shield, Zap, Workflow, ArrowDown, ArrowRight, Activity, CheckCircle } from 'lucide-react';

export const ArchitectureViewer: React.FC = () => {
  const [selectedService, setSelectedService] = useState<string>('electron');

  const services = [
    {
      id: 'electron',
      title: 'Electron Desktop Shell',
      sub: 'main.js / boot-services.js',
      icon: Layers,
      color: 'from-sky-500/20 via-blue-500/10 to-transparent border-sky-500/40',
      badge: 'Master Process',
      details: 'Spawns and monitors background Next.js and FastAPI subprocesses, manages child PIDs, registers OS shutdown hooks, and handles IPC context bridge.'
    },
    {
      id: 'nextjs',
      title: 'Next.js 14 App Service',
      sub: 'Port 3000 • React & Prisma',
      icon: Server,
      color: 'from-indigo-500/20 via-purple-500/10 to-transparent border-indigo-500/40',
      badge: 'Web / API Layer',
      details: 'Serves Cytoscape.js UI, provides internal REST API endpoints, coordinates unified job queues (BullMQ / MemoryQueue), and executes SQLite Prisma transactions.'
    },
    {
      id: 'fastapi',
      title: 'FastAPI NLP Engine',
      sub: 'Port 8000 • spaCy & Kùzu API',
      icon: Cpu,
      color: 'from-purple-500/20 via-pink-500/10 to-transparent border-purple-500/40',
      badge: 'Machine Learning',
      details: 'Runs spaCy 3.7 multilingual entity extraction pipelines, Tesseract OCR document parser, sliding window co-occurrence calculators, and KuzuDB Cypher query executions.'
    },
    {
      id: 'sqlite',
      title: 'SQLite Relational DB',
      sub: 'dev.db / production.db',
      icon: Database,
      color: 'from-emerald-500/20 via-teal-500/10 to-transparent border-emerald-500/40',
      badge: 'Metadata DB',
      details: 'Manages sessions, uploaded file catalog, entity occurrences, text neighborhood excerpts, emails, and pipeline workflow definitions.'
    },
    {
      id: 'kuzudb',
      title: 'KuzuDB Graph Database',
      sub: 'kuzu_data/kuzu.db',
      icon: Database,
      color: 'from-amber-500/20 via-orange-500/10 to-transparent border-amber-500/40',
      badge: 'Embedded Graph DB',
      details: 'Embedded C++ graph engine storing Entity vertices and CO_OCCURRED_WITH edges for ultra-fast Cypher graph traversals.'
    }
  ];

  const current = services.find((s) => s.id === selectedService) || services[0];

  return (
    <section id="architecture" className="py-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold">
            <Layers className="w-3.5 h-3.5" />
            System Blueprint
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Decoupled Multi-Service Desktop Architecture
          </h2>
          <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
            Hackmanite compiles complex ML pipelines, relational metadata, embedded graph databases, and web servers locally inside an Electron shell wrapper.
          </p>
        </div>

        {/* Architecture Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {services.map((svc) => {
            const Icon = svc.icon;
            const isSelected = svc.id === selectedService;

            return (
              <div
                key={svc.id}
                onClick={() => setSelectedService(svc.id)}
                className={`glass-panel p-5 rounded-2xl cursor-pointer border bg-gradient-to-b ${svc.color} transition-all ${
                  isSelected ? 'scale-105 shadow-xl border-indigo-400' : 'hover:scale-[1.02]'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-900 border border-gray-800 flex items-center justify-center text-indigo-400">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-gray-900/80 text-gray-300 border border-gray-800">
                    {svc.badge}
                  </span>
                </div>

                <h3 className="text-xs font-bold text-white">
                  {svc.title}
                </h3>
                <p className="text-[10px] text-gray-400 mt-1 font-mono">
                  {svc.sub}
                </p>
              </div>
            );
          })}
        </div>

        {/* Detailed Selected Inspector */}
        <div className="glass-panel p-6 rounded-2xl border border-gray-800 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
              <Activity className="w-4 h-4" />
              <span>{current.badge} Inspection</span>
            </div>
            <h3 className="text-xl font-bold text-white">
              {current.title}
            </h3>
            <p className="text-xs text-gray-300 leading-relaxed max-w-3xl">
              {current.details}
            </p>
          </div>

          <div className="bg-gray-900/90 px-4 py-3 rounded-xl border border-gray-800 text-xs font-mono text-emerald-400 flex items-center gap-2 flex-shrink-0">
            <CheckCircle className="w-4 h-4" />
            <span>Process Status: Active & Monitoring</span>
          </div>
        </div>

      </div>
    </section>
  );
};
