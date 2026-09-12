'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DropZone from '@/components/upload/DropZone';
import FileList from '@/components/upload/FileList';
import Header from '@/components/layout/Header';
import StatusBar from '@/components/layout/StatusBar';
import { useUpload } from '@/hooks/useUpload';
import { useUploadStore } from '@/store/uploadStore';
import Button from '@/components/ui/Button';
import { useTranslation } from '@/lib/i18n';
import { useOnboardingTour } from '@/hooks/useOnboardingTour';
import WelcomeTourModal from '@/components/tour/WelcomeTourModal';

export default function HomeClient() {
  const router = useRouter();
  const { uploadFiles, isUploading } = useUpload();
  const { files, doneCount, failedCount } = useUploadStore();
  const [mounted, setMounted] = useState(false);
  const { t } = useTranslation();
  const { isModalOpen, openWelcomeModal, startTourDirectly, skipTour } = useOnboardingTour();

  useEffect(() => setMounted(true), []);

  const doneVal = mounted ? doneCount() : 0;
  const failedVal = mounted ? failedCount() : 0;
  const filesVal = mounted ? files.length : 0;
  const canExplore = mounted && doneVal > 0;

  return (
    <div className="home-layout" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}>
      <WelcomeTourModal
        isOpen={isModalOpen}
        onStartTour={startTourDirectly}
        onSkipTour={skipTour}
      />
      <Header />
      <main className="home-main grid grid-cols-1 md:grid-cols-2 overflow-y-auto md:overflow-hidden" style={{ flex: 1, gap: '1px', background: 'var(--color-border)' }}>
        <section className="home-left" style={{ background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'clamp(1rem, 3vh, 3.5rem) 1.5rem', position: 'relative', overflowY: 'auto' }}>
          <div className="home-hero" style={{ width: '100%', maxWidth: '540px', position: 'relative', margin: 'auto 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', gap: '0.75rem' }}>
              <h1 className="home-title" style={{ fontSize: '1.75rem', fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.25, margin: 0 }}>
                {t('home.hero_title_1')}<br /><span style={{ color: 'var(--text-secondary)' }}>{t('home.hero_title_2')}</span>
              </h1>
              <button
                type="button"
                onClick={openWelcomeModal}
                title={t('tour.action.start')}
                style={{
                  background: 'rgba(124, 58, 237, 0.1)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  color: 'var(--color-primary-hover)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                  flexShrink: 0,
                  alignSelf: 'flex-start',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(124, 58, 237, 0.2)';
                  e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.6)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(124, 58, 237, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                {t('tour.action.start')}
              </button>
            </div>
            <DropZone onDrop={uploadFiles} isLoading={isUploading} />
            {canExplore && (
              <div style={{ marginTop: '1.5rem' }}>
                <Button id="explore-graph-btn" variant="primary" size="lg" fullWidth onClick={() => router.push('/graph')} style={{ fontFamily: 'var(--font-display)' }}>{t('home.explore_btn')}</Button>
                <p className="home-queue-head" style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                  {t('home.files_processed', { count: doneVal, plural: doneVal !== 1 ? 's' : '' })}
                  {failedVal > 0 && t('home.files_failed', { count: failedVal, plural: failedVal !== 1 ? 's' : '' })}
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="home-right flex flex-col min-h-[380px] md:min-h-0" style={{ background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem clamp(1rem, 4vw, 3rem)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 className="home-queue-label" style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>{t('home.queue_label')}</h2>
            <span className="home-queue-count" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {t('home.queue_count', { count: filesVal, plural: filesVal !== 1 ? 's' : '' })}
            </span>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {mounted ? <FileList /> : (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', color: 'var(--text-muted)' }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity={0.4}>
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="9" y1="9" x2="15" y2="9" /><line x1="9" y1="12" x2="15" y2="12" /><line x1="9" y1="15" x2="12" y2="15" />
                </svg>
                <p style={{ fontSize: '0.8125rem' }}>{t('home.empty_queue_title')}</p>
                <p style={{ fontSize: '0.7rem' }}>{t('home.empty_queue_copy')}</p>
              </div>
            )}
          </div>
        </section>
      </main>
      <StatusBar />
    </div>
  );
}
