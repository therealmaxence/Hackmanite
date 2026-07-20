import React, { useState } from 'react';
import { FolderGit2, Network, Mail, Sparkles, Workflow, Bot, Database, BookOpen, Layers, Menu, X } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'Home & Upload', icon: FolderGit2 },
    { id: 'graph', label: 'Explore Graph', icon: Network },
    { id: 'emails', label: 'Emails', icon: Mail },
    { id: 'weak-signals', label: 'Weak Signals', icon: Sparkles },
    { id: 'pipelines', label: 'Pipelines', icon: Workflow },
    { id: 'ai-report', label: 'AI Report', icon: Bot },
    { id: 'db-schema', label: 'DB Schema', icon: Database },
    { id: 'wiki', label: 'Wiki & Docs', icon: BookOpen },
    { id: 'architecture', label: 'Architecture', icon: Layers },
  ];

  const handleNavClick = (id: string) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 sticky top-0 z-50 text-slate-100 font-sans shadow-md">
      {/* Brand Logo & Name */}
      <div 
        onClick={() => handleNavClick('home')}
        className="flex items-center space-x-2.5 cursor-pointer group"
      >
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-extrabold text-white text-sm shadow-md shadow-indigo-600/30 group-hover:bg-indigo-500 transition-colors">
          H
        </div>
        <span className="font-extrabold text-base text-slate-100 tracking-tight">
          Hackmanite
        </span>
        <span className="hidden sm:inline-block text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/80">
          v1.0.0
        </span>
      </div>

      {/* Desktop Navigation Links */}
      <nav className="hidden lg:flex items-center space-x-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-slate-800 text-indigo-400 font-semibold border border-slate-700/80'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Mobile Menu Toggle */}
      <div className="lg:hidden">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 rounded-md text-slate-400 hover:text-white bg-slate-800 border border-slate-700"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden absolute top-14 left-0 right-0 bg-slate-900 border-b border-slate-800 p-3 space-y-1 shadow-2xl z-50">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`flex items-center space-x-2.5 w-full px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-800 text-indigo-400 font-semibold border border-slate-700'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4 text-indigo-400" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
