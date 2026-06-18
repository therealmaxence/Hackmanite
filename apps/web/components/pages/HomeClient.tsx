'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DropZone from '@/components/upload/DropZone';
import FileList from '@/components/upload/FileList';
import Header from '@/components/layout/Header';
import StatusBar from '@/components/layout/StatusBar';
import { useUpload } from '@/hooks/useUpload';
import { useUploadStore } from '@/store/uploadStore';
import Button from '@/components/ui/Button';
import { useTranslation } from '@/lib/i18n';

export default function HomeClient() {
  const router = useRouter();
  const { uploadFiles, isUploading } = useUpload();
  const { files, doneCount, failedCount } = useUploadStore();
  const [mounted, setMounted] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDrop = useCallback(
    async (accepted: File[]) => {
      await uploadFiles(accepted);
    },
    [uploadFiles]
  );

  const canExplore = mounted && doneCount() > 0;

  return (
    <div
      className="home-layout"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-base)',
      }}
    >
      <Header />

      <main
        className="home-main grid grid-cols-1 md:grid-cols-2 overflow-y-auto md:overflow-hidden"
        style={{
          flex: 1,
          gap: '1px',
          background: 'var(--color-border)',
        }}
      >
        {/* Left: Drop Zone */}
        <section
          className="home-left"
          style={{
            background: 'var(--bg-base)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: 'clamp(1rem, 3vh, 3.5rem) 1.5rem',
            position: 'relative',
            overflowY: 'auto',
          }}
        >
          <div className="home-hero" style={{ width: '100%', maxWidth: '540px', position: 'relative', margin: 'auto 0' }}>
            <h1
              className="home-title"
              style={{
                fontSize: '1.75rem',
                fontWeight: 500,
                color: 'var(--text-primary)',
                marginBottom: '0.75rem',
                lineHeight: 1.25,
              }}
            >
              {t('home.hero_title_1')}
              <br />
              <span style={{ color: 'var(--text-secondary)' }}>{t('home.hero_title_2')}</span>
            </h1>

            <DropZone onDrop={handleDrop} isLoading={isUploading} />

            {canExplore && (
              <div style={{ marginTop: '1.5rem' }}>
                <Button
                  id="explore-graph-btn"
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={() => router.push('/graph')}
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {t('home.explore_btn')}
                </Button>
                <p
                  className="home-queue-head"
                  style={{
                    textAlign: 'center',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    marginTop: '0.75rem',
                  }}
                >
                  {t('home.files_processed', {
                    count: mounted ? doneCount() : 0,
                    plural: (mounted ? doneCount() : 0) !== 1 ? 's' : ''
                  })}
                  {mounted && failedCount() > 0 && t('home.files_failed', {
                    count: failedCount(),
                    plural: failedCount() !== 1 ? 's' : ''
                  })}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Right: File List */}
        <section
          className="home-right flex flex-col min-h-[380px] md:min-h-0"
          style={{
            background: 'var(--bg-surface)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '1.5rem clamp(1rem, 4vw, 3rem)',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <h2 className="home-queue-label" style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>
              {t('home.queue_label')}
            </h2>
            <span
              className="home-queue-count"
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {t('home.queue_count', {
                count: mounted ? files.length : 0,
                plural: (mounted ? files.length : 0) !== 1 ? 's' : ''
              })}
            </span>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {mounted ? <FileList /> : (
              <div
                style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '1.5rem',
                  color: 'var(--text-muted)',
                }}
              >
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  opacity={0.4}
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="9" y1="9" x2="15" y2="9" />
                  <line x1="9" y1="12" x2="15" y2="12" />
                  <line x1="9" y1="15" x2="12" y2="15" />
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
