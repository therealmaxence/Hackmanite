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

  useEffect(() => {
    let isMounted = true;
    const cleanChart = chart.trim();
    const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;

    mermaid
      .render(id, cleanChart)
      .then(({ svg }) => {
        if (isMounted) {
          setSvgContent(svg);
          setError(false);
        }
      })
      .catch((err) => {
        console.warn('Mermaid render warning:', err);
        // Fallback: try stripping init directives if present
        const strippedChart = cleanChart.replace(/%%\{init:[\s\S]*?\}%%/g, '').trim();
        mermaid
          .render(`${id}-retry`, strippedChart)
          .then(({ svg }) => {
            if (isMounted) {
              setSvgContent(svg);
              setError(false);
            }
          })
          .catch(() => {
            if (isMounted) {
              setError(true);
            }
          });
      });

    return () => {
      isMounted = false;
    };
  }, [chart]);

  if (error) {
    return (
      <div className="my-4 p-4 rounded-xl bg-[#18171c] border border-[#222129] font-mono text-xs text-[#a78bfa] overflow-x-auto">
        <pre>{chart}</pre>
      </div>
    );
  }

  return (
    <div className="my-6 p-6 rounded-xl bg-[#111014] border border-[#222129] shadow-2xl overflow-x-auto flex justify-center">
      <div
        ref={containerRef}
        className="w-full flex justify-center text-slate-100"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    </div>
  );
};
