import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { FeatureShowcase } from './components/FeatureShowcase';
import { InteractiveGraphSandbox } from './components/InteractiveGraphSandbox';
import { DatabaseSchemaExplorer } from './components/DatabaseSchemaExplorer';
import { PipelineVisualizer } from './components/PipelineVisualizer';
import { WeakSignalsCalculator } from './components/WeakSignalsCalculator';
import { WikiReader } from './components/WikiReader';
import { ArchitectureViewer } from './components/ArchitectureViewer';
import { Footer } from './components/Footer';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('overview');

  const scrollToSection = (id: string) => {
    setActiveTab(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-gray-100 font-sans selection:bg-indigo-600 selection:text-white">
      {/* Navigation Header */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Hero Section */}
      <Hero onNavigate={scrollToSection} />

      {/* Feature Showcase Grid */}
      <FeatureShowcase onSelectFeature={scrollToSection} />

      {/* Interactive Cytoscape Graph Explorer Sandbox */}
      <InteractiveGraphSandbox />

      {/* Interactive Database Schema Viewer (SQLite + KuzuDB) */}
      <DatabaseSchemaExplorer />

      {/* Visual Pipeline Builder Canvas */}
      <PipelineVisualizer />

      {/* Weak Signals Discovery Engine & Calculator */}
      <WeakSignalsCalculator />

      {/* Searchable Full Wiki & Documentation Reader */}
      <WikiReader />

      {/* Architecture System Blueprint */}
      <ArchitectureViewer />

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default App;
