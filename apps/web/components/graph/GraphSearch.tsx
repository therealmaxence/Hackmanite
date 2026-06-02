'use client';

interface Props {
  value: string;
  onChange: (val: string) => void;
}

export default function GraphSearch({ value, onChange }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label htmlFor="graph-search-input" style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Search</label>
      <div className="graph-search" style={{ position: 'relative' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          id="graph-search-input"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search entities…"
          className="signature-input"
          style={{ width: '100%', height: 42, paddingLeft: 36, paddingRight: 12 }}
        />
      </div>
    </div>
  );
}
