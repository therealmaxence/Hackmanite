import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, ArrowLeft, ArrowRight } from 'lucide-react';
import { DOCS_ITEMS, DocItem } from '../data/docsContent';
import { MermaidDiagram } from './MermaidDiagram';

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
    <div className="flex-1 overflow-y-auto p-6 md:p-8 font-sans max-w-4xl mx-auto">
      
      {/* Top Article Header Bar */}
      <div className="flex items-center justify-between border-b border-[#18171c] pb-4 mb-6">
        <div>
          <span className="text-[11px] font-bold text-[#a78bfa] uppercase tracking-wider">
            {doc.category}
          </span>
          <h1 className="text-2xl font-extrabold text-white mt-1">
            {doc.title}
          </h1>
          <p className="text-xs text-[#80808c] mt-1">
            {doc.summary}
          </p>
        </div>

        <button
          onClick={handleCopy}
          className="btn-hackmanite flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-[#18171c] text-[#f0f0f4] border border-[#222129] rounded"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy MD'}</span>
        </button>
      </div>

      {/* Rendered Markdown Body */}
      <div className="markdown-body">
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
            pre({ children }) {
              return <>{children}</>;
            },
            code({ className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              const isMermaid = match && match[1] === 'mermaid';
              const codeString = String(children).replace(/\n$/, '');

              if (isMermaid) {
                return <MermaidDiagram chart={codeString} />;
              }

              // Standard code block if className exists, or inline code if not
              if (className) {
                return (
                  <pre className="bg-[#111014] border border-[#222129] p-4 rounded-xl overflow-x-auto my-4 text-xs font-mono text-indigo-300">
                    <code className={className} {...props}>
                      {children}
                    </code>
                  </pre>
                );
              }

              return (
                <code className="bg-[#18171c] text-[#a78bfa] px-1.5 py-0.5 rounded border border-[#222129] font-mono text-xs" {...props}>
                  {children}
                </code>
              );
            },
          }}
        >
          {doc.content}
        </ReactMarkdown>
      </div>

      {/* Pagination Bar */}
      <div className="grid grid-cols-2 gap-4 mt-12 pt-6 border-t border-[#18171c] text-xs">
        {prevDoc ? (
          <button
            onClick={() => onNavigateDoc(prevDoc.id)}
            className="btn-hackmanite p-4 rounded-xl bg-[#111014] border border-[#222129] text-left transition-all group"
          >
            <div className="text-[10px] text-[#80808c] flex items-center space-x-1">
              <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
              <span>Previous Article</span>
            </div>
            <div className="font-bold text-[#f0f0f4] mt-1 group-hover:text-[#a78bfa]">
              {prevDoc.title}
            </div>
          </button>
        ) : <div />}

        {nextDoc ? (
          <button
            onClick={() => onNavigateDoc(nextDoc.id)}
            className="btn-hackmanite p-4 rounded-xl bg-[#111014] border border-[#222129] text-right transition-all group"
          >
            <div className="text-[10px] text-[#80808c] flex items-center justify-end space-x-1">
              <span>Next Article</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </div>
            <div className="font-bold text-[#f0f0f4] mt-1 group-hover:text-[#a78bfa]">
              {nextDoc.title}
            </div>
          </button>
        ) : <div />}
      </div>

    </div>
  );
};
