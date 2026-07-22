import React, { useState } from 'react';
import { ChevronDown, Github } from 'lucide-react';

interface HackmaniteHeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedDocId: string;
  setSelectedDocId: (id: string) => void;
}

export const HackmaniteHeader: React.FC<HackmaniteHeaderProps> = ({
  setActiveTab,
  selectedDocId,
  setSelectedDocId,
}) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const navGroups = [
    {
      key: 'documentation',
      label: 'Documentation & Wiki',
      items: [
        { id: 'readme', label: 'Overview & Quickstart' },
        { id: 'getting-started', label: '1. Getting Started' },
        { id: 'session-management', label: '2. Session Management' },
        { id: 'graph-explorer', label: '3. Graph Explorer' },
        { id: 'co-occurrence', label: '4. Co-occurrence Analysis' },
        { id: 'emails', label: '5. Emails Dashboard' },
      ],
    },
    {
      key: 'analysis',
      label: 'Analysis Workflows',
      items: [
        { id: 'weak-signals', label: '6. Weak Signals Discovery' },
        { id: 'pipeline-builder', label: '7. Pipeline Builder' },
        { id: 'ai-reports', label: '8. AI LLM Intelligence Reports' },
      ],
    },
    {
      key: 'architecture',
      label: 'System & DB Specs',
      items: [
        { id: 'architecture', label: '9. Project Architecture' },
      ],
    },
  ];

  return (
    <header className="header-shell h-16 bg-[#111014] border-none px-6 flex items-center justify-between sticky top-0 z-50 text-[#f0f0f4] font-sans shadow-lg">
      <div 
        onClick={() => {
          setSelectedDocId('readme');
          setActiveTab('guide');
        }}
        className="flex items-center space-x-3 cursor-pointer group"
      >
        <div className="flex items-center space-x-2.5">
          <div className="relative w-10 h-10 flex items-center justify-center">
            <div className="absolute w-8 h-8 rounded-full bg-purple-600/30 blur-md group-hover:scale-125 transition-transform" />
            <img
              src="./hackmanite_main_nobg.png"
              alt="Hackmanite Logo"
              className="w-10 h-10 object-contain relative z-10"
              onError={(e) => {
                e.currentTarget.src = 'hackmanite_main_nobg.png';
              }}
            />
          </div>

          <span className="text-[#80808c] font-light text-sm">×</span>

          <div className="relative w-14 h-14 flex items-center justify-center">
            <img
              src="./geode_logo.png"
              alt="GEODE Logo"
              className="w-14 h-14 object-contain relative z-10 rounded-md scale-110"
              onError={(e) => {
                e.currentTarget.src = 'geode_logo.png';
              }}
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-[#f0f0f4] to-[#a78bfa] bg-clip-text text-transparent">
            Hackmanite
          </span>
          <span className="text-[10px] font-semibold text-[#a78bfa] bg-[#7c3aed]/20 px-2 py-0.5 rounded tracking-wide border-none">
            by GEODE
          </span>
          <span className="hidden sm:inline-block text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-[#18171c] text-[#80808c]">
            v1.0.0
          </span>
        </div>
      </div>

      <nav className="hidden md:flex items-center space-x-1 relative">
        <button
          onClick={() => {
            setSelectedDocId('readme');
            setActiveTab('guide');
          }}
          className={`px-3.5 py-2 rounded-md text-xs font-medium transition-colors border-none ${
            selectedDocId === 'readme'
              ? 'text-[#a78bfa] bg-[#18171c]'
              : 'text-[#80808c] hover:text-[#f0f0f4] hover:bg-[#18171c]/60'
          }`}
        >
          Help Center
        </button>

        {navGroups.map((group) => {
          const isExpanded = openDropdown === group.key;
          const hasActiveItem = group.items.some((item) => item.id === selectedDocId);

          return (
            <div
              key={group.key}
              className="relative"
              onMouseEnter={() => setOpenDropdown(group.key)}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <button
                type="button"
                className={`px-3 py-2 rounded-md text-xs font-medium transition-colors border-none flex items-center space-x-1.5 ${
                  hasActiveItem || isExpanded
                    ? 'text-[#a78bfa] bg-[#18171c]'
                    : 'text-[#80808c] hover:text-[#f0f0f4] hover:bg-[#18171c]/60'
                }`}
              >
                <span>{group.label}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180 text-[#a78bfa]' : ''}`} />
              </button>

              {isExpanded && (
                <div className="absolute top-full left-0 pt-2 w-64 z-50">
                  <div className="bg-[#111014] border-none rounded-xl p-2 shadow-2xl space-y-1">
                    {group.items.map((item) => {
                      const isItemSelected = selectedDocId === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setSelectedDocId(item.id);
                            setOpenDropdown(null);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors border-none ${
                            isItemSelected
                              ? 'bg-[#18171c] text-[#a78bfa] font-semibold'
                              : 'text-[#f0f0f4] hover:bg-[#18171c]/70 hover:text-[#a78bfa]'
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="flex items-center space-x-3">
        <a
          href="https://github.com/therealmaxence/EntityGraph"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-hackmanite flex items-center space-x-2 px-3.5 py-2 text-xs font-medium bg-[#18171c] text-[#f0f0f4] rounded-md shadow-md border-none"
        >
          <Github className="w-4 h-4 text-[#a78bfa]" />
          <span className="hidden sm:inline">GitHub Repository</span>
        </a>
      </div>
    </header>
  );
};
