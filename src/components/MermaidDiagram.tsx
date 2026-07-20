import React, { useEffect, useRef } from 'react';
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

  useEffect(() => {
    if (!containerRef.current) return;
    const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
    containerRef.current.innerHTML = '';

    try {
      mermaid.render(id, chart).then(({ svg }) => {
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      }).catch((err) => {
        console.error('Mermaid render error:', err);
        if (containerRef.current) {
          containerRef.current.innerHTML = `<pre class="text-xs text-rose-400 p-3 bg-[#18171c] rounded">${chart}</pre>`;
        }
      });
    } catch (e) {
      console.error(e);
    }
  }, [chart]);

  return (
    <div className="my-6 p-4 rounded-xl bg-[#111014] border border-[#222129] shadow-lg overflow-x-auto flex justify-center">
      <div ref={containerRef} className="w-full flex justify-center" />
    </div>
  );
};
