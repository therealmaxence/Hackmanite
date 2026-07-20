import React from 'react';
import { BookOpen, FileText, ChevronRight, Layers, Workflow, Info } from 'lucide-react';
import { DOCS_ITEMS, DocItem } from '../data/docsContent';

interface DocsSidebarProps {
  selectedDocId: string;
  setSelectedDocId: (id: string) => void;
  searchQuery: string;
}

export const DocsSidebar: React.FC<DocsSidebarProps> = ({
  selectedDocId,
  setSelectedDocId,
  searchQuery,
}) => {
  const categories: Array<DocItem['category']> = ['Overview', 'User Guides', 'Workflows', 'Architecture'];

  const filteredDocs = DOCS_ITEMS.filter((item) =>
    !searchQuery ||
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col h-[calc(100vh-3.5rem)] overflow-y-auto text-xs font-sans">
      <div className="p-4 space-y-6">
        {categories.map((cat) => {
          const catItems = filteredDocs.filter((d) => d.category === cat);
          if (catItems.length === 0) return null;

          return (
            <div key={cat} className="space-y-1.5">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2 flex items-center justify-between">
                <span>{cat}</span>
                <span className="text-[9px] font-mono text-slate-500">({catItems.length})</span>
              </div>

              <div className="space-y-0.5">
                {catItems.map((item) => {
                  const isSelected = item.id === selectedDocId;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedDocId(item.id)}
                      className={`w-full text-left px-3 py-2 rounded-md transition-colors flex items-center justify-between group ${
                        isSelected
                          ? 'bg-indigo-600/20 text-indigo-300 font-semibold border-l-2 border-indigo-500'
                          : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                      }`}
                    >
                      <span className="truncate">{item.title}</span>
                      <ChevronRight className={`w-3 h-3 transition-transform ${isSelected ? 'text-indigo-400 opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
