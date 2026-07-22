'use client';

const colors = { PENDING: 'var(--text-muted)', PROCESSING: 'var(--accent)', DONE: 'var(--success)', FAILED: 'var(--error)', CANCELLED: 'var(--error)' };

export default function StatusDot({ status }: { status: keyof typeof colors }) {
  return (
    <div style={{ position: 'relative', width: 8, height: 8, flexShrink: 0 }}>
      <div style={{ width: 8, height: 8, borderRadius: 1, background: colors[status] || 'var(--text-muted)' }} />
    </div>
  );
}
