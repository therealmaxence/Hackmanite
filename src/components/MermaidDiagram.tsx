import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

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

  useEffect(() => {
    let isMounted = true;
    
    // Clean init directives and whitespace
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

  if (error || !svgContent) {
    return (
      <div className="my-6 p-4 rounded-xl bg-[#111014] border border-[#222129] text-xs font-mono text-[#a78bfa] overflow-x-auto">
        <div className="text-[10px] font-bold text-slate-500 uppercase mb-2">Diagram Source</div>
        <pre>{chart}</pre>
      </div>
    );
  }

  return (
    <div className="my-6 p-6 rounded-xl bg-[#111014] border border-[#222129] shadow-2xl overflow-x-auto flex justify-center">
      <div
        ref={containerRef}
        className="w-full flex justify-center text-slate-100 overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    </div>
  );
};
