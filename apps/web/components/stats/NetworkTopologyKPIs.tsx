import { KPICard } from './KPICard';

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
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-8" style={{ gap: '2.5rem', width: '100%', marginTop: '-3rem' }}>
      <KPICard
        label="Graph Density"
        value={density}
        sub="Ratio of connections to possible pairings"
        color="#A84CF0"
      />
      <KPICard
        label="Clustering Coeff."
        value={clusteringCoefficient}
        sub="Tendency of nodes to form tight groups"
        color="#4CF0A8"
      />
      <KPICard
        label="Avg Path Length"
        value={avgPathLength}
        sub="Average steps between any two entities"
        color="#F0A84C"
      />
    </div>
  );
}
