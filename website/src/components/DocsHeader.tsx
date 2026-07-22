import React from 'react';
import { Search, Github } from 'lucide-react';

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
    <header className="h-14 bg-[#111827] border-b border-[#374151] px-4 flex items-center justify-between sticky top-0 z-50 text-slate-100 font-sans shadow-md">
      
      {/* Brand Logo & Name */}
      <div 
        onClick={() => setSelectedDocId('readme')}
        className="flex items-center space-x-2.5 cursor-pointer group"
      >
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-extrabold text-white text-sm shadow-md shadow-indigo-600/30 group-hover:bg-indigo-500 transition-colors">
          H
        </div>
        <span className="font-extrabold text-base text-slate-100 tracking-tight">
          Hackmanite
        </span>
        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#1f2937] text-indigo-400 border border-[#374151]">
          v1.0.0 Wiki & Docs
        </span>
      </div>

      {/* Global Search Bar */}
      <div className="relative w-64 sm:w-96">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Search all documentation & wiki articles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#0b0f19] border border-[#374151] rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
        />
      </div>

      {/* GitHub Action Button */}
      <div className="flex items-center space-x-3">
        <a
          href="https://github.com/therealmaxence/Hackmanite"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-hackmanite flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold"
        >
          <Github className="w-4 h-4" />
          <span className="hidden sm:inline">GitHub Repository</span>
        </a>
      </div>

    </header>
  );
};
