interface ConnectivityStatsProps {
  connectivity: {
    sharedEntitiesCount: number;
    uniqueEntitiesCount: number;
  };
  density: {
    entitiesPerKb: number;
  };
}

export default function ConnectivityStats({ connectivity, density }: ConnectivityStatsProps) {
  const shared = connectivity?.sharedEntitiesCount || 0;
  const unique = connectivity?.uniqueEntitiesCount || 0;
  const total = shared + unique;
  const sharedPct = total > 0 ? (shared / total) * 100 : 0;
  const uniquePct = total > 0 ? (unique / total) * 100 : 0;

  return (
    <div
      className="signature-card flex flex-col justify-between"
      style={{
        padding: '2.5rem',
        gap: '2.5rem',
      }}
    >
      <h3 className="text-sm font-semibold text-white/70">
        Entity Linkage & Density
      </h3>

      <div className="space-y-6">
        <div>
          <div className="flex justify-between items-end mb-2">
            <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider">
              Cross-Document Connectivity
            </span>
            <span className="font-mono text-xs text-white/70">
              {sharedPct.toFixed(1)}% Shared
            </span>
          </div>
          <div className="w-full h-2 bg-white/[0.04] overflow-hidden flex">
            <div
              className="h-full transition-all duration-1000"
              style={{
                width: `${sharedPct}%`,
                background: 'linear-gradient(90deg, var(--color-primary), #A84CF0)',
              }}
            />
          </div>
          <div className="flex justify-between mt-1 text-[9px] font-mono text-white/35">
            <span>{shared} entities link multiple files</span>
            <span>{unique} entities are document-specific</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-white/[0.04] pt-6">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider">
              Extraction Density
            </span>
            <span className="text-2xl font-bold font-mono text-white/95">
              {density?.entitiesPerKb ? (density.entitiesPerKb * 100).toFixed(1) : '0.0'}
            </span>
            <span className="text-[9px] text-white/30 italic">
              Occurrences per 100 KB
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider">
              Link Density Index
            </span>
            <span className="text-2xl font-bold font-mono text-white/95">
              {total > 0 ? (shared / total).toFixed(3) : '0.000'}
            </span>
            <span className="text-[9px] text-white/30 italic">
              Ratio of global connectives
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
