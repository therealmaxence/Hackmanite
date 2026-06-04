'use client';

import Header from '@/components/layout/Header';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useUploadStore } from '@/store/uploadStore';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import { useGraphStore } from '@/store/graphStore';
import LegendBar from '@/components/graph/LegendBar';
import Spinner from '@/components/ui/Spinner';

// Extracted Sub-Components
import StatsKPIGrid from '@/components/stats/StatsKPIGrid';
import NetworkTopologyKPIs from '@/components/stats/NetworkTopologyKPIs';
import EntityDistributionChart from '@/components/stats/EntityDistributionChart';
import TopEntitiesLeaderboard from '@/components/stats/TopEntitiesLeaderboard';
import BridgeEntitiesTable from '@/components/stats/BridgeEntitiesTable';
import FileTypeGrid from '@/components/stats/FileTypeGrid';
import { KPICard } from '@/components/stats/KPICard';
import ConnectivityStats from '@/components/stats/ConnectivityStats';
import CooccurrencePairs from '@/components/stats/CooccurrencePairs';
import TemporalActivity from '@/components/stats/TemporalActivity';

// Extracted Utilities
import { ALL_ENTITY_TYPES } from '@/lib/stats-utils';

interface StatsData {
  general: {
    totalFiles: number;
    totalSize: number;
    avgSize: number;
    totalEntities: number;
    totalOccurrences: number;
  };
  topEntities: Array<{
    label: string;
    type: string;
    count: number;
  }>;
  entityTypeDistribution: Array<{
    type: string;
    count: number;
  }>;
  fileTypeDistribution: Array<{
    mimeType: string;
    count: number;
    totalSize: number;
  }>;
  connectivity: {
    sharedEntitiesCount: number;
    uniqueEntitiesCount: number;
  };
  cooccurrences: Array<{
    typeA: string;
    typeB: string;
    count: number;
  }>;
  temporal: {
    minDate: string | null;
    maxDate: string | null;
    activityHours: Array<{ hour: number; count: number }>;
  };
  density: {
    entitiesPerKb: number;
  };
}

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
});

function PanelLoader({ message }: { message: string }) {
  return (
    <div
      className="signature-card flex flex-col items-center justify-center gap-4 animate-pulse"
      style={{
        minHeight: '400px',
        padding: '2.5rem',
        border: '1px dashed rgba(255, 255, 255, 0.08)',
        background: 'rgba(10, 12, 16, 0.25)',
      }}
    >
      <Spinner size={24} />
      <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.15em]">{message}</p>
    </div>
  );
}

export default function StatsClient() {
  const { sessionId } = useUploadStore();
  const { filters, setFilter } = useGraphStore();
  const [displayLimit, setDisplayLimit] = useState(10);
  const [showLegend, setShowLegend] = useState(true);

  useEffect(() => {
    const mainEl = document.querySelector('main');
    if (!mainEl) return;

    const checkScrollability = () => {
      const isScrollable = mainEl.scrollHeight > mainEl.clientHeight;
      setShowLegend(!isScrollable || mainEl.scrollTop > 10);
    };

    checkScrollability();

    const observer = new ResizeObserver(checkScrollability);
    observer.observe(mainEl);
    window.addEventListener('resize', checkScrollability);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', checkScrollability);
    };
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const mainEl = e.currentTarget;
    const isScrollable = mainEl.scrollHeight > mainEl.clientHeight;
    setShowLegend(!isScrollable || mainEl.scrollTop > 10);
  };

  useEffect(() => {
    setFilter('entityTypes', ALL_ENTITY_TYPES);
  }, [setFilter]);

  // 1. General SWR Query (Fast)
  const { data: generalData, error: generalError, isLoading: generalLoading } = useSWR<StatsData>(
    sessionId
      ? `/api/stats?sessionId=${sessionId}&types=${filters.entityTypes.join(',')}&limit=${displayLimit}`
      : null,
    fetcher,
    { 
      refreshInterval: 10000,
      keepPreviousData: true
    }
  );

  // 2. Topology SWR Query (Medium)
  const { data: topologyData } = useSWR<{
    density: number;
    avgPathLength: number;
    clusteringCoefficient: number;
  }>(
    sessionId ? `/api/stats/topology?sessionId=${sessionId}` : null,
    fetcher,
    { refreshInterval: 10000 }
  );

  // 3. Bridges SWR Query (Heavy)
  const { data: bridgesData } = useSWR<{
    bridgeEntities: Array<{
      id: string;
      label: string;
      type: string;
      score: number;
    }>;
  }>(
    sessionId ? `/api/stats/bridges?sessionId=${sessionId}` : null,
    fetcher,
    { refreshInterval: 10000 }
  );



  // Only block the whole page if the basic general statistics are not loaded yet
  const isPageLoading = generalLoading || !generalData;
  const isPageError = generalError;

  return (
    <div className="min-h-screen bg-base flex flex-col">
      <Header />

      <main
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto custom-scrollbar"
      >
        <div
          className="w-full mx-auto flex flex-col"
          style={{
            gap: '4.5rem',
            padding: '4rem 2rem 6rem 2rem',
            width: '100%',
          }}
        >
          {/* Page Header */}
          <header className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <h1 className="text-4xl md:text-5xl font-display font-bold text-white leading-tight">
                StatisticsDashboard
              </h1>
              <p className="text-sm text-white/40 tracking-[0.04em] mt-4 ml-0.5 font-medium">
                Session analytics and graph metrics.
              </p>
            </motion.div>
          </header>



          {!sessionId ? (
            <div
              className="h-[400px] signature-card flex flex-col items-center justify-center gap-6"
            >
              <Image
                src="/dagex-nobg.png"
                alt="EntityGraph"
                width={180}
                height={180}
                style={{ objectFit: 'contain', opacity: 0.07, userSelect: 'none', pointerEvents: 'none' }}
                draggable={false}
              />
              <p className="text-sm text-white/40 font-mono font-medium">No active session</p>
            </div>
          ) : isPageLoading ? (
            <div className="h-[400px] flex flex-col items-center justify-center gap-6">
              <Spinner size={32} />
              <p className="text-sm font-mono text-white/40 animate-pulse">Analyzing graph structure...</p>
            </div>
          ) : isPageError ? (
            <div className="p-10 glass rounded-sm border border-error/20 text-center space-y-4">
              <p className="text-error font-bold">Analysis Interrupted</p>
              <p className="text-sm text-white/40">Failed to retrieve session statistics from the neural service.</p>
            </div>
          ) : generalData && generalData.general ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
              className="flex flex-col"
              style={{ gap: '5rem' }}
            >
              {/* KPI Grid (Rendered Immediately) */}
              <StatsKPIGrid general={generalData.general} />

              {/* Network Topology KPI Grid (Progressively Loaded) */}
              {topologyData ? (
                <NetworkTopologyKPIs
                  density={topologyData.density}
                  clusteringCoefficient={topologyData.clusteringCoefficient}
                  avgPathLength={topologyData.avgPathLength}
                />
              ) : (
                <div
                  className="grid grid-cols-1 sm:grid-cols-3 gap-8"
                  style={{ gap: '2.5rem', width: '100%', marginTop: '-3rem' }}
                >
                  <KPICard
                    label="Graph Density"
                    value="..."
                    sub="Calculating network density..."
                    color="#A84CF0"
                  />
                  <KPICard
                    label="Clustering Coeff."
                    value="..."
                    sub="Finding local clusters..."
                    color="#4CF0A8"
                  />
                  <KPICard
                    label="Avg Path Length"
                    value="..."
                    sub="Measuring shortest paths..."
                    color="#F0A84C"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12" style={{ gap: '2.5rem', width: '100%' }}>
                {/* Distribution Chart (Rendered Immediately) */}
                <EntityDistributionChart data={generalData.entityTypeDistribution} />

                {/* Top Entities (Rendered Immediately) */}
                <TopEntitiesLeaderboard
                  topEntities={generalData.topEntities}
                  displayLimit={displayLimit}
                  setDisplayLimit={setDisplayLimit}
                />
              </div>

              {/* Temporal & Linkage Analytics */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12" style={{ gap: '2.5rem', width: '100%' }}>
                <TemporalActivity temporal={generalData.temporal} />
                <ConnectivityStats
                  connectivity={generalData.connectivity}
                  density={generalData.density}
                />
              </div>

              {/* Source & Structural Intelligence */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12" style={{ gap: '2.5rem', width: '100%' }}>
                <div className="lg:col-span-3">
                  <FileTypeGrid fileTypeDistribution={generalData.fileTypeDistribution} />
                </div>
              </div>

              {/* Centrality & Neighborhood Clusters */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12" style={{ gap: '2.5rem', width: '100%' }}>
                <div>
                  {bridgesData ? (
                    <BridgeEntitiesTable bridgeEntities={bridgesData.bridgeEntities} />
                  ) : (
                    <PanelLoader message="Identifying central bridge entities..." />
                  )}
                </div>
                <CooccurrencePairs cooccurrences={generalData.cooccurrences} />
              </div>

            </motion.div>
          ) : null}

        </div>
      </main>

      <div
        style={{
          transform: showLegend ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
        }}
      >
        <LegendBar
          nodeCount={generalData?.general?.totalEntities}
          edgeCount={generalData?.general?.totalOccurrences}
        />
      </div>
    </div>
  );
}
