"use client";
import React, { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n';

export default function ElectronTitleBar() {
  const [isElectron, setIsElectron] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const isApp = window.navigator.userAgent.toLowerCase().includes('electron');
    setIsElectron(isApp);
    if (isApp) {
      document.body.classList.add('is-electron');
      (window as any).electronAPI?.isMaximized().then(setIsMaximized);
    }
  }, []);

  if (!isElectron) return null;

  const api = (window as any).electronAPI;

  const handleMaximize = () => {
    api?.maximize();
    setTimeout(async () => setIsMaximized(await api?.isMaximized()), 150);
  };

  return (
    <div 
      className="w-full h-8 flex items-center justify-between text-xs px-3 select-none"
      style={{
        background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text)',
        WebkitAppRegion: 'drag', zIndex: 9999, position: 'sticky', top: 0
      } as any}
    >
      <span className="font-medium tracking-tight">Hackmanite</span>
      <div className="flex items-center h-full" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <button 
          onClick={() => api?.minimize()}
          className="h-8 w-11 flex items-center justify-center hover:bg-[var(--color-surface-hover)] transition-colors duration-150 outline-none border-none cursor-pointer"
          title={t('titlebar.minimize')}
          style={{ background: 'transparent', color: 'var(--color-text)' }}
        >
          <svg width="10" height="1" viewBox="0 0 10 1" fill="none"><rect width="10" height="1" fill="currentColor"/></svg>
        </button>

        <button 
          onClick={handleMaximize}
          className="h-8 w-11 flex items-center justify-center hover:bg-[var(--color-surface-hover)] transition-colors duration-150 outline-none border-none cursor-pointer"
          title={isMaximized ? t('titlebar.restore') : t('titlebar.maximize')}
          style={{ background: 'transparent', color: 'var(--color-text)' }}
        >
          {isMaximized ? (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <rect x="2" y="1" width="7" height="7" stroke="currentColor" strokeWidth="1" fill="none"/>
              <path d="M1 9V3H3V8H8V9H1Z" fill="currentColor"/>
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <rect x="1" y="1" width="8" height="8" stroke="currentColor" strokeWidth="1" fill="none"/>
            </svg>
          )}
        </button>

        <button 
          onClick={() => api?.close()}
          className="h-8 w-11 flex items-center justify-center hover:bg-[#e11d48] hover:text-white transition-colors duration-150 outline-none border-none cursor-pointer"
          title={t('titlebar.close')}
          style={{ background: 'transparent', color: 'currentColor' }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.2"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
