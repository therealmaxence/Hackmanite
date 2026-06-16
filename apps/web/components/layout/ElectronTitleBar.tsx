"use client";

import React, { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n';

export default function ElectronTitleBar() {
  const [isElectron, setIsElectron] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isApp = userAgent.includes('electron');
    setIsElectron(isApp);

    if (isApp && (window as any).electronAPI) {
      // Check initial maximized state
      (window as any).electronAPI.isMaximized().then(setIsMaximized);
    }
  }, []);

  if (!isElectron) return null;

  const handleMinimize = () => {
    (window as any).electronAPI?.minimize();
  };

  const handleMaximize = async () => {
    (window as any).electronAPI?.maximize();
    // Fetch state after a tiny delay to allow Electron state to settle
    setTimeout(async () => {
      const state = await (window as any).electronAPI?.isMaximized();
      setIsMaximized(state);
    }, 150);
  };

  const handleClose = () => {
    (window as any).electronAPI?.close();
  };

  return (
    <div 
      className="w-full h-8 flex items-center justify-between text-xs px-3 select-none"
      style={{
        background: 'var(--color-bg)',
        borderBottom: '1px solid var(--color-border)',
        color: 'var(--color-text)',
        WebkitAppRegion: 'drag' as any,
        zIndex: 9999,
        position: 'relative'
      } as any}
    >
      {/* Title */}
      <div className="flex items-center gap-2">
        <span className="font-medium tracking-tight">Hackmanite</span>
      </div>

      {/* Window Controls */}
      <div className="flex items-center h-full" style={{ WebkitAppRegion: 'no-drag' as any } as any}>
        {/* Minimize */}
        <button 
          onClick={handleMinimize}
          className="h-8 w-11 flex items-center justify-center hover:bg-[var(--color-surface-hover)] transition-colors duration-150 outline-none border-none cursor-pointer"
          title={t('titlebar.minimize')}
          style={{ background: 'transparent', color: 'var(--color-text)' }}
        >
          <svg width="10" height="1" viewBox="0 0 10 1" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="10" height="1" fill="currentColor"/>
          </svg>
        </button>

        {/* Maximize */}
        <button 
          onClick={handleMaximize}
          className="h-8 w-11 flex items-center justify-center hover:bg-[var(--color-surface-hover)] transition-colors duration-150 outline-none border-none cursor-pointer"
          title={isMaximized ? t('titlebar.restore') : t('titlebar.maximize')}
          style={{ background: 'transparent', color: 'var(--color-text)' }}
        >
          {isMaximized ? (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="1" width="7" height="7" stroke="currentColor" strokeWidth="1" fill="none"/>
              <path d="M1 9V3H3V8H8V9H1Z" fill="currentColor"/>
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="8" height="8" stroke="currentColor" strokeWidth="1" fill="none"/>
            </svg>
          )}
        </button>

        {/* Close */}
        <button 
          onClick={handleClose}
          className="h-8 w-11 flex items-center justify-center hover:bg-[#e11d48] hover:text-white transition-colors duration-150 outline-none border-none cursor-pointer"
          title={t('titlebar.close')}
          style={{ background: 'transparent', color: 'currentColor' }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.2"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
