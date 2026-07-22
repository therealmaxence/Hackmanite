import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Maximize2, X } from 'lucide-react';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    darkMode: true,
    background: '#111014',
    primaryColor: '#7c3aed',
    primaryTextColor: '#f0f0f4',
    primaryBorderColor: '#a78bfa',
    lineColor: '#a78bfa',
    secondaryColor: '#d946ef',
    tertiaryColor: '#18171c',
    noteBkgColor: '#18171c',
    noteTextColor: '#f0f0f4',
  },
  securityLevel: 'loose',
});

interface MermaidDiagramProps {
  chart: string;
}

export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [error, setError] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    
    let cleanChart = chart.trim();
    cleanChart = cleanChart.replace(/%%\{init:[\s\S]*?\}%%/g, '').trim();

    const id = `mermaid-svg-${Math.random().toString(36).substring(2, 9)}`;

    mermaid
      .render(id, cleanChart)
      .then(({ svg }) => {
        if (isMounted) {
          setSvgContent(svg);
          setError(false);
        }
      })
      .catch((err) => {
        console.warn('Mermaid render error:', err);
        if (isMounted) {
          setError(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [chart]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  if (error || !svgContent) {
    return (
      <div className="my-6 p-4 rounded-xl bg-[#111014] border border-transparent font-mono text-xs text-[#a78bfa] overflow-x-auto">
        <div className="text-[10px] font-bold text-slate-500 uppercase mb-2">Diagram Source</div>
        <pre>{chart}</pre>
      </div>
    );
  }

  return (
    <>
      <div className="relative my-6 p-6 rounded-xl bg-[#111014] shadow-2xl overflow-x-auto flex flex-col items-center group">
        <button
          onClick={() => setIsFullscreen(true)}
          className="absolute top-3 right-3 btn-hackmanite p-2 text-[#80808c] hover:text-white transition-all rounded-md opacity-80 group-hover:opacity-100 flex items-center space-x-1 text-xs"
          title="Full Screen View"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span className="text-[11px] font-medium hidden sm:inline">Fullscreen</span>
        </button>

        <div
          ref={containerRef}
          className="w-full flex justify-center text-slate-100 overflow-x-auto pt-2"
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      </div>

      {isFullscreen && (
        <div className="fixed inset-0 z-[999] bg-[#0a090c]/95 backdrop-blur-md p-6 flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
            <span className="text-sm font-bold text-[#f0f0f4] flex items-center space-x-2">
              <span>Diagram Fullscreen View</span>
            </span>

            <button
              onClick={() => setIsFullscreen(false)}
              className="btn-hackmanite p-2 text-slate-300 hover:text-white transition-all rounded-md flex items-center space-x-1 text-xs"
            >
              <X className="w-4 h-4" />
              <span>Close (Esc)</span>
            </button>
          </div>

          <div className="flex-1 overflow-auto flex items-center justify-center p-4">
            <div
              className="w-full max-w-6xl flex justify-center text-slate-100 max-h-full"
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          </div>
        </div>
      )}
    </>
  );
};
