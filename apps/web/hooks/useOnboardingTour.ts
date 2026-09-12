'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from '@/lib/i18n';
import { startHomeTour, isTourCompleted, markTourCompleted } from '@/lib/tour/tourService';

export function useOnboardingTour(options?: { autoStart?: boolean }) {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const autoStart = options?.autoStart ?? true;
  const tourInstanceRef = useRef<any>(null);

  const startTourDirectly = useCallback(() => {
    setIsModalOpen(false);
    // Delay slightly so the modal finishes unmounting cleanly
    setTimeout(() => {
      try {
        tourInstanceRef.current = startHomeTour(t);
      } catch (err) {
        console.error('[Tour] Failed to start onboarding tour:', err);
      }
    }, 150);
  }, [t]);

  const skipTour = useCallback(() => {
    setIsModalOpen(false);
    markTourCompleted();
  }, []);

  const openWelcomeModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('hackmanite_trigger_tour') === 'true') {
      sessionStorage.removeItem('hackmanite_trigger_tour');
      setIsModalOpen(true);
      return;
    }

    if (!autoStart) return;

    if (!isTourCompleted()) {
      const timer = setTimeout(() => {
        setIsModalOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoStart]);

  return {
    isModalOpen,
    openWelcomeModal,
    startTourDirectly,
    skipTour,
  };
}
