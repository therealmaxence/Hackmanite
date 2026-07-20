import React from 'react';
import { List } from 'lucide-react';

interface TOCHeader {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  content: string;
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({ content }) => {
  const lines = content.split('\n');
  const headers: TOCHeader[] = [];

  lines.forEach((line) => {
    const match = line.match(/^(#{1,3})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim().replace(/\*/g, '');
      const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
      headers.push({ id, text, level });
    }
  });

  if (headers.length === 0) return null;

  const scrollToHeader = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <aside className="w-64 hidden xl:block bg-[#111827] border-l border-[#374151] p-5 h-[calc(100vh-3.5rem)] overflow-y-auto text-xs font-sans">
      <div className="space-y-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5 border-b border-[#374151] pb-2">
          <List className="w-3.5 h-3.5 text-indigo-400" />
          <span>On this page</span>
        </div>

        <nav className="space-y-1">
          {headers.map((h, idx) => (
            <button
              key={idx}
              onClick={() => scrollToHeader(h.id)}
              className={`block w-full text-left truncate transition-colors text-slate-400 hover:text-indigo-400 ${
                h.level === 1 ? 'font-semibold text-slate-200 text-xs mt-2' : h.level === 2 ? 'pl-2 text-[11px]' : 'pl-4 text-[10px] text-slate-400'
              }`}
            >
              {h.text}
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
};
