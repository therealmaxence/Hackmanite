import React from 'react';
import { BookOpen, Search, Github, FileText, ChevronRight } from 'lucide-react';

interface DocsHeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedDocId: string;
  setSelectedDocId: (id: string) => void;
}

export const DocsHeader: React.FC<DocsHeaderProps> = ({
  searchQuery,
  setSearchQuery,
  selectedDocId,
  setSelectedDocId,
}) => {
  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-50 text-slate-100 font-sans shadow-md">
      
      {/* Logo & Title */}
      <div 
        onClick={() => setSelectedDocId('readme')}
        className="flex items-center space-x-3 cursor-pointer group"
      >
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-extrabold text-white text-sm shadow-md shadow-indigo-600/30 group-hover:bg-indigo-500 transition-colors">
          H
        </div>
        <div className="flex items-center space-x-2">
          <span className="font-extrabold text-base text-slate-100 tracking-tight">
            Hackmanite
          </span>
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-indigo-400 border border-slate-700">
            Docs & Wiki Hub
          </span>
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="relative w-72 sm:w-96">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Search all documentation & wiki articles... (Ctrl + K)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
        />
      </div>

      {/* GitHub Link */}
      <div className="flex items-center space-x-4">
        <a
          href="https://github.com/therealmaxence/EntityGraph"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-2 text-xs text-slate-400 hover:text-white transition-colors bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/60"
        >
          <Github className="w-4 h-4" />
          <span className="hidden sm:inline font-medium">GitHub</span>
        </a>
      </div>

    </header>
  );
};
