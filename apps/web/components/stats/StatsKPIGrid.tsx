import { KPICard } from './KPICard';
import { formatBytes } from '@/lib/stats-utils';

interface StatsKPIGridProps {
  general: {
    totalFiles: number;
    totalSize: number;
    totalEntities: number;
    totalOccurrences: number;
  };
}

export default function StatsKPIGrid({ general }: StatsKPIGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8" style={{ gap: '2rem', width: '100%' }}>
      <KPICard
        label="Total Files"
        value={general.totalFiles}
        sub="Documents processed"
        color="#4CA8F0"
      />
      <KPICard
        label="Total Entities"
        value={general.totalEntities}
        sub="Unique nodes found"
        color="#8AF04C"
      />
      <KPICard
        label="Occurrences"
        value={general.totalOccurrences}
        sub="Total connections"
        color="#F04C6A"
      />
      <KPICard
        label="Total Size"
        value={formatBytes(general.totalSize)}
        sub="Processed volume"
        color="#F0F04C"
      />
    </div>
  );
}
