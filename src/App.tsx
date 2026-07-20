import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { HomeView } from './components/HomeView';
import { InteractiveGraphSandbox } from './components/InteractiveGraphSandbox';
import { EmailView } from './components/EmailView';
import { WeakSignalsCalculator } from './components/WeakSignalsCalculator';
import { PipelineVisualizer } from './components/PipelineVisualizer';
import { AiReportView } from './components/AiReportView';
import { DatabaseSchemaExplorer } from './components/DatabaseSchemaExplorer';
import { WikiReader } from './components/WikiReader';
import { ArchitectureViewer } from './components/ArchitectureViewer';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('home');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-600 selection:text-white flex flex-col">
      {/* Hackmanite Official Header Bar */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Active Application Page View */}
      <main className="flex-1">
        {activeTab === 'home' && <HomeView onNavigateToGraph={() => setActiveTab('graph')} />}
        {activeTab === 'graph' && <InteractiveGraphSandbox />}
        {activeTab === 'emails' && <EmailView />}
        {activeTab === 'weak-signals' && <WeakSignalsCalculator />}
        {activeTab === 'pipelines' && <PipelineVisualizer />}
        {activeTab === 'ai-report' && <AiReportView />}
        {activeTab === 'db-schema' && <DatabaseSchemaExplorer />}
        {activeTab === 'wiki' && <WikiReader />}
        {activeTab === 'architecture' && <ArchitectureViewer />}
      </main>
    </div>
  );
};

export default App;
