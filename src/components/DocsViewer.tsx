import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, ChevronLeft, ChevronRight, FileText, ArrowLeft, ArrowRight } from 'lucide-react';
import { DOCS_ITEMS, DocItem } from '../data/docsContent';

interface DocsViewerProps {
  doc: DocItem;
  onNavigateDoc: (id: string) => void;
}

export const DocsViewer: React.FC<DocsViewerProps> = ({ doc, onNavigateDoc }) => {
  const [copied, setCopied] = useState<boolean>(false);

  const currentIndex = DOCS_ITEMS.findIndex((d) => d.id === doc.id);
  const prevDoc = currentIndex > 0 ? DOCS_ITEMS[currentIndex - 1] : null;
  const nextDoc = currentIndex < DOCS_ITEMS.length - 1 ? DOCS_ITEMS[currentIndex + 1] : null;

  const handleCopy = () => {
    navigator.clipboard.writeText(doc.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 font-sans max-w-4xl mx-auto">
      
      {/* Top Meta Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
        <div>
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
            {doc.category}
          </span>
          <h1 className="text-2xl font-extrabold text-white mt-1">
            {doc.title}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {doc.summary}
          </p>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy MD'}</span>
        </button>
      </div>

      {/* Rendered Markdown Body */}
      <div className="prose prose-invert max-w-none prose-headings:font-bold prose-headings:text-white prose-h1:text-2xl prose-h1:border-b prose-h1:border-slate-800 prose-h1:pb-2 prose-h2:text-xl prose-h2:border-b prose-h2:border-slate-800/60 prose-h2:pb-1 prose-h3:text-lg prose-p:text-slate-300 prose-p:text-sm prose-p:leading-relaxed prose-li:text-slate-300 prose-li:text-sm prose-code:text-indigo-300 prose-code:bg-slate-900 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-800 prose-blockquote:border-indigo-500 prose-blockquote:bg-indigo-500/10 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-table:border prose-table:border-slate-800 prose-th:bg-slate-900 prose-th:p-2.5 prose-th:text-xs prose-td:p-2.5 prose-td:text-xs prose-td:border-t prose-td:border-slate-800">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1({ children, ...props }) {
              const text = String(children);
              const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
              return <h1 id={id} {...props}>{children}</h1>;
            },
            h2({ children, ...props }) {
              const text = String(children);
              const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
              return <h2 id={id} {...props}>{children}</h2>;
            },
            h3({ children, ...props }) {
              const text = String(children);
              const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
              return <h3 id={id} {...props}>{children}</h3>;
            },
          }}
        >
          {doc.content}
        </ReactMarkdown>
      </div>

      {/* Pagination Bar */}
      <div className="grid grid-cols-2 gap-4 mt-12 pt-6 border-t border-slate-800 text-xs">
        {prevDoc ? (
          <button
            onClick={() => onNavigateDoc(prevDoc.id)}
            className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 text-left transition-colors group"
          >
            <div className="text-[10px] text-slate-500 flex items-center space-x-1">
              <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
              <span>Previous Article</span>
            </div>
            <div className="font-bold text-slate-200 mt-1 group-hover:text-indigo-300">
              {prevDoc.title}
            </div>
          </button>
        ) : <div />}

        {nextDoc ? (
          <button
            onClick={() => onNavigateDoc(nextDoc.id)}
            className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 text-right transition-colors group"
          >
            <div className="text-[10px] text-slate-500 flex items-center justify-end space-x-1">
              <span>Next Article</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </div>
            <div className="font-bold text-slate-200 mt-1 group-hover:text-indigo-300">
              {nextDoc.title}
            </div>
          </button>
        ) : <div />}
      </div>

    </div>
  );
};
