'use client';
import Header from '@/components/layout/Header';
import NoActiveSessionPanel from '@/components/ui/NoActiveSessionPanel';
import { useUploadStore } from '@/store/uploadStore';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from '@/lib/i18n';
import WeakSignalsTable from '@/components/weak-signals/WeakSignalsTable';


interface Signal { id: string; label: string; type: string; totalCount: number; fileCount: number; score: number }
interface WeakSignalsData { bridgeSignals: Signal[]; nicheSignals: Signal[]; emergingSignals: Signal[] }

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('Failed to fetch weak signals');
  return res.json();
});

export default function WeakSignalsClient() {
  const { sessionId } = useUploadStore();
  const { t } = useTranslation();
  const { data, error, isLoading } = useSWR<WeakSignalsData>(
    sessionId ? `/api/stats/weak-signals?sessionId=${sessionId}` : null,
    fetcher,
    { refreshInterval: 15000, keepPreviousData: true }
  );

  return (
    <div className="min-h-screen bg-base flex flex-col">
      <Header />
      <main className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="w-full mx-auto flex flex-col" style={{ gap: '4.5rem', padding: '4rem 2rem 6rem 2rem', width: '100%' }}>
          <header className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-display font-bold text-white leading-tight">{t('weak_signals.title')}</h1>
            </motion.div>
          </header>

          {!sessionId ? (
            <NoActiveSessionPanel message={t('stats.no_active_session')} />
          ) : isLoading ? (
            <div className="h-[400px] flex flex-col items-center justify-center gap-6">
              <Spinner size={32} />
              <p className="text-sm font-mono text-white/40 animate-pulse">{t('stats.analyzing')}</p>
            </div>
          ) : error ? (
            <div className="p-10 glass rounded-sm border border-error/20 text-center space-y-4">
              <p className="text-error font-bold">{t('stats.error_title')}</p>
              <p className="text-sm text-white/40">{t('stats.error_desc')}</p>
            </div>
          ) : data ? (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} style={{ width: '100%' }}>
              <WeakSignalsTable
                bridgeSignals={data.bridgeSignals}
                nicheSignals={data.nicheSignals}
                emergingSignals={data.emergingSignals}
              />
            </motion.div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
