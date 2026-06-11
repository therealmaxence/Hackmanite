interface MarkdownReportProps {
  report: string;
}

export default function MarkdownReport({ report }: MarkdownReportProps) {
  const parseInlineElements = (text: string) => {
    const codeParts = text.split(/`([^`]+)`/g);
    return codeParts.map((part, i) => {
      if (i % 2 === 1) {
        return (
          <code key={i} className="font-mono text-xs bg-surface-input px-1.5 py-0.5 rounded text-secondary-hover">
            {part}
          </code>
        );
      }
      const boldParts = part.split('**');
      return boldParts.map((bPart, j) => {
        if (j % 2 === 1) {
          return (
            <strong key={j} className="text-white font-bold">
              {bPart}
            </strong>
          );
        }
        return bPart;
      });
    });
  };

  const parseMarkdown = (text: string) => {
    return text.split('\n').map((line, idx) => {
      if (line.startsWith('# ')) {
        return (
          <h1 key={idx} className="text-2xl font-display font-semibold text-white mt-6 mb-3 border-b border-white/5 pb-2">
            {parseInlineElements(line.slice(2))}
          </h1>
        );
      }
      if (line.startsWith('## ')) {
        return (
          <h2 key={idx} className="text-xl font-display font-semibold text-white/90 mt-5 mb-2">
            {parseInlineElements(line.slice(3))}
          </h2>
        );
      }
      if (line.startsWith('### ')) {
        return (
          <h3 key={idx} className="text-lg font-display font-semibold text-white/80 mt-4 mb-1">
            {parseInlineElements(line.slice(4))}
          </h3>
        );
      }
      if (line.startsWith('#### ')) {
        return (
          <h4 key={idx} className="text-base font-display font-semibold text-white/70 mt-3 mb-1">
            {parseInlineElements(line.slice(5))}
          </h4>
        );
      }
      if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('+ ')) {
        return (
          <li key={idx} className="ml-5 list-disc text-white/70 mb-1.5 leading-relaxed text-sm">
            {parseInlineElements(line.slice(2))}
          </li>
        );
      }
      if (line.match(/^\d+\.\s/)) {
        const content = line.replace(/^\d+\.\s/, '');
        return (
          <li
            key={idx}
            className="ml-5 list-decimal text-white/70 mb-1.5 leading-relaxed text-sm"
            style={{ listStyleType: 'decimal' }}
          >
            {parseInlineElements(content)}
          </li>
        );
      }
      if (line.trim() === '---') {
        return <hr key={idx} className="border-t border-white/5 my-6" />;
      }
      if (line.trim() === '') {
        return <div key={idx} className="h-2" />;
      }
      return (
        <p key={idx} className="text-white/70 mb-2.5 leading-relaxed text-sm">
          {parseInlineElements(line)}
        </p>
      );
    });
  };

  return <div className="prose max-w-none text-white/80">{parseMarkdown(report)}</div>;
}
