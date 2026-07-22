'use client';
import { FileStatus } from '@/types/entities';

const statusProgress: Record<FileStatus, number> = { PENDING: 5, PROCESSING: 60, DONE: 100, FAILED: 100, CANCELLED: 100 };
const statusColor: Record<FileStatus, string> = { PENDING: 'var(--text-muted)', PROCESSING: 'var(--accent)', DONE: 'var(--success)', FAILED: 'var(--error)', CANCELLED: 'var(--error)' };

export default function ProgressBar({ status }: { status: FileStatus }) {
  const progress = statusProgress[status], color = statusColor[status], isProcessing = status === 'PROCESSING';
  return (
    <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden', marginLeft: '1.375rem' }}>
      <div
        style={{
          height: '100%',
          width: `${progress}%`,
          background: isProcessing ? `linear-gradient(90deg, ${color}, var(--info), ${color})` : color,
          borderRadius: 2,
          transition: isProcessing ? 'none' : 'width 500ms ease',
          backgroundSize: isProcessing ? '200% 100%' : 'auto',
          animation: isProcessing ? 'shimmer 1.5s infinite' : 'none',
        }}
      />
    </div>
  );
}
