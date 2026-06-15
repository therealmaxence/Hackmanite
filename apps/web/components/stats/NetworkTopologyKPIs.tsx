import { KPICard } from './KPICard';
import { useTranslation } from '@/lib/i18n';

interface NetworkTopologyKPIsProps {
  density: number;
  clusteringCoefficient: number;
  avgPathLength: number;
}

export default function NetworkTopologyKPIs({
  density,
  clusteringCoefficient,
  avgPathLength,
}: NetworkTopologyKPIsProps) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-8" style={{ gap: '2.5rem', width: '100%', marginTop: '-3rem' }}>
      <KPICard
        label={t('stats.kpi.density')}
        value={density}
        sub={t('stats.kpi.density_sub')}
        color="#A84CF0"
      />
      <KPICard
        label={t('stats.kpi.clustering')}
        value={clusteringCoefficient}
        sub={t('stats.kpi.clustering_sub')}
        color="#4CF0A8"
      />
      <KPICard
        label={t('stats.kpi.path_length')}
        value={avgPathLength}
        sub={t('stats.kpi.path_length_sub')}
        color="#F0A84C"
      />
    </div>
  );
}
