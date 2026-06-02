import { formatMimeType } from '@/lib/stats-utils';

interface FileTypeItem {
  mimeType: string;
  count: number;
}

interface FileTypeGridProps {
  fileTypeDistribution: FileTypeItem[];
}

export default function FileTypeGrid({ fileTypeDistribution }: FileTypeGridProps) {
  return (
    <div
      className="signature-card flex flex-col"
      style={{
        padding: '2.5rem',
        gap: '2.5rem',
      }}
    >
      <h3 className="text-sm font-semibold text-white/70">
        Source formats
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {fileTypeDistribution.map((item) => (
          <div
            key={item.mimeType}
            className="flex items-center gap-5 rounded-sm transition-colors"
            style={{
              padding: '1.5rem',
              background: 'rgba(16, 0, 43, 0.4)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div className="w-10 h-10 shrink-0 rounded-sm bg-white/5 flex items-center justify-center text-white/25">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-mono font-bold text-white/90 truncate">
                {formatMimeType(item.mimeType)}
              </p>
              <p className="text-[10px] text-white/25 uppercase tracking-widest mt-0.5">
                {item.count} {item.count === 1 ? 'File' : 'Files'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
