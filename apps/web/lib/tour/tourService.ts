'use client';

import { driver, Driver, DriveStep } from 'driver.js';

export const TOUR_STORAGE_KEY = 'hackmanite_tour_seen';

export function isTourCompleted(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(TOUR_STORAGE_KEY) === 'true';
}

export function markTourCompleted(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOUR_STORAGE_KEY, 'true');
}

export function resetTourStatus(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOUR_STORAGE_KEY);
}

export function startHomeTour(
  t: (key: string, params?: Record<string, any>) => string,
  onFinish?: () => void
): Driver {
  const steps: DriveStep[] = [
    {
      element: '#dropzone',
      popover: {
        title: t('tour.steps.dropzone.title'),
        description: t('tour.steps.dropzone.desc'),
        side: 'bottom',
        align: 'center',
        popoverClass: 'hackmanite-tour-popover',
      },
    },
    {
      element: '#dropzone',
      popover: {
        title: t('tour.steps.ocr.title'),
        description: t('tour.steps.ocr.desc'),
        side: 'bottom',
        align: 'center',
        popoverClass: 'hackmanite-tour-popover',
      },
    },
    {
      element: '.home-right',
      popover: {
        title: t('tour.steps.queue.title'),
        description: t('tour.steps.queue.desc'),
        side: 'left',
        align: 'start',
        popoverClass: 'hackmanite-tour-popover',
      },
    },
    {
      element: '.home-right',
      popover: {
        title: t('tour.steps.retry.title'),
        description: t('tour.steps.retry.desc'),
        side: 'left',
        align: 'start',
        popoverClass: 'hackmanite-tour-popover',
      },
    },
    {
      element: '#nav-menu-view',
      popover: {
        title: t('tour.steps.view_menu.title'),
        description: t('tour.steps.view_menu.desc'),
        side: 'bottom',
        align: 'start',
        popoverClass: 'hackmanite-tour-popover',
      },
    },
    {
      element: '#nav-menu-custom-analysis',
      popover: {
        title: t('tour.steps.custom_menu.title'),
        description: t('tour.steps.custom_menu.desc'),
        side: 'bottom',
        align: 'start',
        popoverClass: 'hackmanite-tour-popover',
      },
    },
    {
      element: '#nav-menu-general-settings',
      popover: {
        title: t('tour.steps.workspace_menu.title'),
        description: t('tour.steps.workspace_menu.desc'),
        side: 'bottom',
        align: 'start',
        popoverClass: 'hackmanite-tour-popover',
      },
    },
    {
      element: '.header-nav',
      popover: {
        title: t('tour.steps.shortcuts.title'),
        description: t('tour.steps.shortcuts.desc'),
        side: 'bottom',
        align: 'center',
        popoverClass: 'hackmanite-tour-popover',
      },
    },
    {
      element: '.status-bar',
      popover: {
        title: t('tour.steps.statusbar.title'),
        description: t('tour.steps.statusbar.desc'),
        side: 'top',
        align: 'start',
        popoverClass: 'hackmanite-tour-popover',
      },
    },
    {
      popover: {
        title: t('tour.steps.ready.title'),
        description: t('tour.steps.ready.desc'),
        popoverClass: 'hackmanite-tour-popover',
      },
    },
  ];

  const driverObj = driver({
    steps,
    animate: true,
    showProgress: true,
    allowClose: true,
    overlayColor: '#000000',
    overlayOpacity: 0.85,
    stagePadding: 8,
    stageRadius: 6,
    popoverOffset: 14,
    popoverClass: 'hackmanite-tour-popover',
    nextBtnText: t('tour.btn.next'),
    prevBtnText: t('tour.btn.prev'),
    doneBtnText: t('tour.btn.done'),
    onDestroyed: () => {
      markTourCompleted();
      onFinish?.();
    },
  });

  driverObj.drive();
  return driverObj;
}
