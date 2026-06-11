interface MarkdownReportProps {
  report: string;
}

export default function MarkdownReport({ report }: MarkdownReportProps) {
  // Normalize literal '\n' text codes and standard CRLF/CR newlines
  const normalizeText = (text: string) => {
    let normalized = text
      .replace(/\\n/g, '\n')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');

    // Clean LLM markdown code blocks (e.g. ```markdown ... ```) if wrapped
    let cleaned = normalized.trim();
    if (cleaned.startsWith('```markdown')) {
      cleaned = cleaned.substring(11).trim();
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.substring(3).trim();
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.substring(0, cleaned.length - 3).trim();
    }
    return cleaned;
  };

  const parseInlineElements = (text: string) => {
    const codeParts = text.split(/`([^`]+)`/g);
    return codeParts.map((part, i) => {
      if (i % 2 === 1) {
        return (
          <code 
            key={i} 
            className="font-mono text-xs px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: '#d946ef', // Electric Magenta
              fontFamily: 'var(--font-mono, DM Mono, monospace)',
            }}
          >
            {part}
          </code>
        );
      }
      const boldParts = part.split('**');
      return boldParts.map((bPart, j) => {
        if (j % 2 === 1) {
          return (
            <strong key={j} className="font-bold" style={{ color: '#ffffff' }}>
              {bPart}
            </strong>
          );
        }
        return bPart;
      });
    });
  };

  const parseMarkdown = (text: string) => {
    const cleanedText = normalizeText(text);
    return cleanedText.split('\n').map((line, idx) => {
      // Headers
      if (line.startsWith('# ')) {
        return (
          <h1 
            key={idx} 
            style={{ 
              fontSize: '1.75rem', 
              fontWeight: 700, 
              color: '#ffffff', 
              marginTop: '1.75rem', 
              marginBottom: '1rem', 
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)', 
              paddingBottom: '0.5rem',
              fontFamily: 'var(--font-heading)'
            }}
          >
            {parseInlineElements(line.slice(2))}
          </h1>
        );
      }
      if (line.startsWith('## ')) {
        return (
          <h2 
            key={idx} 
            style={{ 
              fontSize: '1.35rem', 
              fontWeight: 600, 
              color: 'rgba(255, 255, 255, 0.95)', 
              marginTop: '1.5rem', 
              marginBottom: '0.75rem',
              fontFamily: 'var(--font-heading)'
            }}
          >
            {parseInlineElements(line.slice(3))}
          </h2>
        );
      }
      if (line.startsWith('### ')) {
        return (
          <h3 
            key={idx} 
            style={{ 
              fontSize: '1.15rem', 
              fontWeight: 600, 
              color: 'rgba(255, 255, 255, 0.9)', 
              marginTop: '1.25rem', 
              marginBottom: '0.5rem',
              fontFamily: 'var(--font-heading)'
            }}
          >
            {parseInlineElements(line.slice(4))}
          </h3>
        );
      }
      if (line.startsWith('#### ')) {
        return (
          <h4 
            key={idx} 
            style={{ 
              fontSize: '1rem', 
              fontWeight: 600, 
              color: 'rgba(255, 255, 255, 0.7)', 
              marginTop: '1rem', 
              marginBottom: '0.5rem',
              fontFamily: 'var(--font-heading)'
            }}
          >
            {parseInlineElements(line.slice(5))}
          </h4>
        );
      }

      // Unordered Lists
      if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('+ ')) {
        return (
          <li 
            key={idx} 
            style={{ 
              listStyleType: 'disc',
              marginLeft: '1.5rem', 
              marginBottom: '0.375rem', 
              color: 'rgba(255, 255, 255, 0.75)', 
              fontSize: '0.875rem', 
              lineHeight: '1.6'
            }}
          >
            {parseInlineElements(line.slice(2))}
          </li>
        );
      }

      // Ordered Lists
      if (line.match(/^\d+\.\s/)) {
        const content = line.replace(/^\d+\.\s/, '');
        return (
          <li
            key={idx}
            style={{ 
              listStyleType: 'decimal',
              marginLeft: '1.5rem', 
              marginBottom: '0.375rem', 
              color: 'rgba(255, 255, 255, 0.75)', 
              fontSize: '0.875rem', 
              lineHeight: '1.6'
            }}
          >
            {parseInlineElements(content)}
          </li>
        );
      }

      // Horizontal Rules
      if (line.trim() === '---') {
        return (
          <hr 
            key={idx} 
            style={{ 
              border: 'none', 
              borderTop: '1px solid rgba(255, 255, 255, 0.08)', 
              margin: '2rem 0' 
            }} 
          />
        );
      }

      // Empty spacing
      if (line.trim() === '') {
        return <div key={idx} style={{ height: '0.5rem' }} />;
      }

      // Normal Paragraphs
      return (
        <p 
          key={idx} 
          style={{ 
            marginBottom: '0.875rem', 
            color: 'rgba(255, 255, 255, 0.75)', 
            fontSize: '0.875rem', 
            lineHeight: '1.6' 
          }}
        >
          {parseInlineElements(line)}
        </p>
      );
    });
  };

  return <div style={{ wordBreak: 'break-word' }}>{parseMarkdown(report)}</div>;
}
