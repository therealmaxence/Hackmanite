'use client';

interface EmailContextMenuProps {
  x: number;
  y: number;
  nodeId: string;
  nodeSubject: string;
  onCopySubject: (subject: string) => void;
  onModify: (id: string) => void;
}

export default function EmailContextMenu({
  x,
  y,
  nodeId,
  nodeSubject,
  onCopySubject,
  onModify,
}: EmailContextMenuProps) {

  const buttonStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: 'var(--color-text)',
    fontSize: '0.8rem',
    fontWeight: 500,
    padding: '6px 12px',
    textAlign: 'left',
    cursor: 'pointer',
    borderRadius: 'var(--radius-xs)',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = 'transparent';
  };

  const handleCopyId = () => {
    navigator.clipboard?.writeText(nodeId).catch(() => {});
  };

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        left: x,
        top: y,
        zIndex: 1000,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-sm)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(8px)',
        padding: '4px',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        minWidth: '150px',
      }}
    >
      <button
        onClick={() => onModify(nodeId)}
        style={buttonStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        Modify
      </button>

      <button
        onClick={() => onCopySubject(nodeSubject)}
        style={buttonStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        Copy Subject
      </button>

      <button
        onClick={handleCopyId}
        style={buttonStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
        </svg>
        Copy Message ID
      </button>
    </div>
  );
}
