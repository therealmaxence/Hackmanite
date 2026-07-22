'use client';
import Header from '@/components/layout/Header';
import NoActiveSessionPanel from '@/components/ui/NoActiveSessionPanel';
import { useState, useEffect } from 'react';
import { useUploadStore } from '@/store/uploadStore';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import { useGraphStore } from '@/store/graphStore';
import LegendBar from '@/components/graph/LegendBar';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from '@/lib/i18n';
import StatsKPIGrid from '@/components/stats/StatsKPIGrid';
import NetworkTopologyKPIs from '@/components/stats/NetworkTopologyKPIs';
import EntityDistributionChart from '@/components/stats/EntityDistributionChart';
import TopEntitiesLeaderboard from '@/components/stats/TopEntitiesLeaderboard';
import TopEntitiesByTfidfLeaderboard from '@/components/stats/TopEntitiesByTfidfLeaderboard';
import BridgeEntitiesTable from '@/components/stats/BridgeEntitiesTable';
import FileTypeGrid from '@/components/stats/FileTypeGrid';
import { KPICard } from '@/components/stats/KPICard';
import ConnectivityStats from '@/components/stats/ConnectivityStats';
import CooccurrencePairs from '@/components/stats/CooccurrencePairs';
import TemporalActivity from '@/components/stats/TemporalActivity';
import { ALL_ENTITY_TYPES } from '@/lib/stats-utils';

interface StatsData {
  general: { totalFiles: number; totalSize: number; avgSize: number; totalEntities: number; totalOccurrences: number; };
  topEntities: Array<{ label: string; type: string; count: number; }>;
  topEntitiesByTfidf: Array<{ label: string; type: string; tfidf: number; }>;
  entityTypeDistribution: Array<{ type: string; count: number; }>;
  fileTypeDistribution: Array<{ mimeType: string; count: number; totalSize: number; }>;
  connectivity: { sharedEntitiesCount: number; uniqueEntitiesCount: number; };
  cooccurrences: Array<{ typeA: string; typeB: string; count: number; }>;
  temporal: { minDate: string | null; maxDate: string | null; activityHours: Array<{ hour: number; count: number }>; };
  density: { entitiesPerKb: number; };
}

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
});

export default function StatsClient() {
  const { sessionId } = useUploadStore();
  const { filters, setFilter } = useGraphStore();
  const [displayLimit, setDisplayLimit] = useState(10);
  const [tfidfDisplayLimit, setTfidfDisplayLimit] = useState(10);
  const [showLegend, setShowLegend] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    const mainEl = document.querySelector('main');
    if (!mainEl) return;
    const checkScroll = () => setShowLegend(!mainEl.scrollHeight || mainEl.scrollHeight <= mainEl.clientHeight || mainEl.scrollTop > 10);
    checkScroll();
    const observer = new ResizeObserver(checkScroll);
    observer.observe(mainEl);
    window.addEventListener('resize', checkScroll);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', checkScroll);
    };
  }, []);

  useEffect(() => { setFilter('entityTypes', ALL_ENTITY_TYPES); }, [setFilter]);

  const { data: generalData, error: generalError, isLoading: generalLoading } = useSWR<StatsData>(
    sessionId ? `/api/stats?sessionId=${sessionId}&types=${filters.entityTypes.join(',')}&limit=${displayLimit}&tfidfLimit=${tfidfDisplayLimit}` : null,
    fetcher, { refreshInterval: 10000, keepPreviousData: true }
  );

  const { data: topologyData } = useSWR<{ density: number; avgPathLength: number; clusteringCoefficient: number; }>(
    sessionId ? `/api/stats/topology?sessionId=${sessionId}` : null, fetcher, { refreshInterval: 10000 }
  );

  const { data: bridgesData } = useSWR<{ bridgeEntities: Array<{ id: string; label: string; type: string; score: number; }>; }>(
    sessionId ? `/api/stats/bridges?sessionId=${sessionId}` : null, fetcher, { refreshInterval: 10000 }
  );

  return (
    <div className="min-h-screen bg-base flex flex-col">
      <Header />
      <main onScroll={(e) => setShowLegend(e.currentTarget.scrollHeight <= e.currentTarget.clientHeight || e.currentTarget.scrollTop > 10)} className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="w-full mx-auto flex flex-col" style={{ gap: '4.5rem', padding: '4rem 2rem 6rem 2rem', width: '100%' }}>
          <header className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-display font-bold text-white leading-tight">{t('stats.title')}</h1>
              <p className="text-sm text-white/40 tracking-[0.04em] mt-4 ml-0.5 font-medium">{t('stats.desc')}</p>
            </motion.div>
          </header>

          {!sessionId ? (
            <NoActiveSessionPanel message={t('stats.no_active_session')} />
          ) : generalLoading || !generalData ? (
            <div className="h-[400px] flex flex-col items-center justify-center gap-6">
              <Spinner size={32} />
              <p className="text-sm font-mono text-white/40 animate-pulse">{t('stats.analyzing')}</p>
            </div>
          ) : generalError ? (
            <div className="p-10 glass rounded-sm border border-error/20 text-center space-y-4">
              <p className="text-error font-bold">{t('stats.error_title')}</p>
              <p className="text-sm text-white/40">{t('stats.error_desc')}</p>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} className="flex flex-col" style={{ gap: '5rem' }}>
              <StatsKPIGrid general={generalData.general} />
              {topologyData ? (
                <NetworkTopologyKPIs density={topologyData.density} clusteringCoefficient={topologyData.clusteringCoefficient} avgPathLength={topologyData.avgPathLength} />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8" style={{ gap: '2.5rem', width: '100%', marginTop: '-3rem' }}>
                  <KPICard label={t('stats.kpi.density')} value="..." sub={t('stats.kpi.density_loading')} color="#A84CF0" />
                  <KPICard label={t('stats.kpi.clustering')} value="..." sub={t('stats.kpi.clustering_loading')} color="#4CF0A8" />
                  <KPICard label={t('stats.kpi.path_length')} value="..." sub={t('stats.kpi.path_length_loading')} color="#F0A84C" />
                </div>
              )}

              <EntityDistributionChart data={generalData.entityTypeDistribution} />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12" style={{ gap: '2.5rem', width: '100%' }}>
                <TopEntitiesLeaderboard topEntities={generalData.topEntities} displayLimit={displayLimit} setDisplayLimit={setDisplayLimit} />
                <TopEntitiesByTfidfLeaderboard topEntities={generalData.topEntitiesByTfidf} displayLimit={tfidfDisplayLimit} setDisplayLimit={setTfidfDisplayLimit} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12" style={{ gap: '2.5rem', width: '100%' }}>
                <TemporalActivity temporal={generalData.temporal} />
                <ConnectivityStats connectivity={generalData.connectivity} density={generalData.density} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12" style={{ gap: '2.5rem', width: '100%' }}><div className="lg:col-span-3"><FileTypeGrid fileTypeDistribution={generalData.fileTypeDistribution} /></div></div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12" style={{ gap: '2.5rem', width: '100%' }}>
                <div>
                  {bridgesData ? <BridgeEntitiesTable bridgeEntities={bridgesData.bridgeEntities} /> : (
                    <div className="signature-card flex flex-col items-center justify-center gap-4 animate-pulse" style={{ minHeight: '400px', padding: '2.5rem', border: '1px dashed rgba(255, 255, 255, 0.08)', background: 'rgba(10, 12, 16, 0.25)' }}>
                      <Spinner size={24} />
                      <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.15em]">{t('stats.bridges.loading')}</p>
                    </div>
                  )}
                </div>
                <CooccurrencePairs cooccurrences={generalData.cooccurrences} />
              </div>
            </motion.div>
          )}
        </div>
      </main>

      <div style={{ transform: showLegend ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100 }}>
        <LegendBar nodeCount={generalData?.general?.totalEntities} edgeCount={generalData?.general?.totalOccurrences} />
      </div>
    </div>
  );
}
