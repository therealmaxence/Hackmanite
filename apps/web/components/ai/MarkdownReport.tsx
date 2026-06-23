export default function MarkdownReport({ report }: { report: string }) {
  const normalizeText = (text: string) => {
    let cleaned = text.replace(/\\n/g, '\n').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    if (cleaned.startsWith('```markdown')) cleaned = cleaned.substring(11).trim();
    else if (cleaned.startsWith('```')) cleaned = cleaned.substring(3).trim();
    if (cleaned.endsWith('```')) cleaned = cleaned.substring(0, cleaned.length - 3).trim();
    return cleaned;
  };

  const parseInlineElements = (text: string) =>
    text.split(/`([^`]+)`/g).map((part, i) => {
      if (i % 2 === 1) {
        return (
          <code key={i} className="font-mono text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#d946ef', fontFamily: 'var(--font-mono, DM Mono, monospace)' }}>
            {part}
          </code>
        );
      }
      return part.split('**').map((bPart, j) => (j % 2 === 1 ? <strong key={j} className="font-bold" style={{ color: '#ffffff' }}>{bPart}</strong> : bPart));
    });

  const parseMarkdown = (text: string) =>
    normalizeText(text).split('\n').map((line, idx) => {
      const matchHeader = line.match(/^(#{1,4})\s+(.*)$/);
      if (matchHeader) {
        const level = matchHeader[1].length;
        const content = matchHeader[2];
        const styles: Record<number, React.CSSProperties> = {
          1: { fontSize: '1.75rem', fontWeight: 700, color: '#ffffff', marginTop: '1.75rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.5rem', fontFamily: 'var(--font-heading)' },
          2: { fontSize: '1.35rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.95)', marginTop: '1.5rem', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)' },
          3: { fontSize: '1.15rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)', marginTop: '1.25rem', marginBottom: '0.5rem', fontFamily: 'var(--font-heading)' },
          4: { fontSize: '1rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.7)', marginTop: '1rem', marginBottom: '0.5rem', fontFamily: 'var(--font-heading)' },
        };
        const Tag = level === 1 ? 'h1' : level === 2 ? 'h2' : level === 3 ? 'h3' : 'h4';
        return <Tag key={idx} style={styles[level]}>{parseInlineElements(content)}</Tag>;
      }

      if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('+ ')) {
        return <li key={idx} style={{ listStyleType: 'disc', marginLeft: '1.5rem', marginBottom: '0.375rem', color: 'rgba(255, 255, 255, 0.75)', fontSize: '0.875rem', lineHeight: '1.6' }}>{parseInlineElements(line.slice(2))}</li>;
      }

      const matchOrdered = line.match(/^\d+\.\s(.*)$/);
      if (matchOrdered) {
        return <li key={idx} style={{ listStyleType: 'decimal', marginLeft: '1.5rem', marginBottom: '0.375rem', color: 'rgba(255, 255, 255, 0.75)', fontSize: '0.875rem', lineHeight: '1.6' }}>{parseInlineElements(matchOrdered[1])}</li>;
      }

      if (line.trim() === '---') {
        return <hr key={idx} style={{ border: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.08)', margin: '2rem 0' }} />;
      }

      if (line.trim() === '') return <div key={idx} style={{ height: '0.5rem' }} />;

      return <p key={idx} style={{ marginBottom: '0.875rem', color: 'rgba(255, 255, 255, 0.75)', fontSize: '0.875rem', lineHeight: '1.6' }}>{parseInlineElements(line)}</p>;
    });

  return <div style={{ wordBreak: 'break-word' }}>{parseMarkdown(report)}</div>;
}
