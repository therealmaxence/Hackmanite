import { KPICard } from './KPICard';
import { formatBytes } from '@/lib/stats-utils';
import { useTranslation } from '@/lib/i18n';

interface StatsKPIGridProps {
  general: {
    totalFiles: number;
    totalSize: number;
    totalEntities: number;
    totalOccurrences: number;
  };
}

export default function StatsKPIGrid({ general }: StatsKPIGridProps) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8" style={{ gap: '2rem', width: '100%' }}>
      <KPICard
        label={t('stats.kpi.total_files')}
        value={general.totalFiles}
        sub={t('stats.kpi.total_files_sub')}
        color="#4CA8F0"
      />
      <KPICard
        label={t('stats.kpi.total_entities')}
        value={general.totalEntities}
        sub={t('stats.kpi.total_entities_sub')}
        color="#8AF04C"
      />
      <KPICard
        label={t('stats.kpi.occurrences')}
        value={general.totalOccurrences}
        sub={t('stats.kpi.occurrences_sub')}
        color="#F04C6A"
      />
      <KPICard
        label={t('stats.kpi.total_size')}
        value={formatBytes(general.totalSize)}
        sub={t('stats.kpi.total_size_sub')}
        color="#F0F04C"
      />
    </div>
  );
}
