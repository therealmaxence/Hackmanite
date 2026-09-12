'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export interface ShortcutDefinition {
  key: string;
  code: string;
  route: string;
  labelKey: string;
  keyDisplay: string;
}

export const NAVIGATION_SHORTCUTS: ShortcutDefinition[] = [
  { key: 'u', code: 'KeyU', route: '/', labelKey: 'nav.upload', keyDisplay: 'Alt+U' },
  { key: 'g', code: 'KeyG', route: '/graph', labelKey: 'nav.graph', keyDisplay: 'Alt+G' },
  { key: 'e', code: 'KeyE', route: '/emails', labelKey: 'nav.emails', keyDisplay: 'Alt+E' },
  { key: 's', code: 'KeyS', route: '/stats', labelKey: 'nav.stats', keyDisplay: 'Alt+S' },
  { key: 'w', code: 'KeyW', route: '/weak-signals', labelKey: 'nav.weak_signals', keyDisplay: 'Alt+W' },
  { key: 'p', code: 'KeyP', route: '/pipelines', labelKey: 'nav.pipelines', keyDisplay: 'Alt+P' },
  { key: 'r', code: 'KeyR', route: '/ai-report', labelKey: 'nav.ai_report', keyDisplay: 'Alt+R' },
  { key: 'o', code: 'KeyO', route: '/session', labelKey: 'nav.session', keyDisplay: 'Alt+O' },
  { key: ',', code: 'Comma', route: '/settings', labelKey: 'nav.settings', keyDisplay: 'Alt+,' },
  { key: 'h', code: 'KeyH', route: '/help', labelKey: 'nav.help', keyDisplay: 'Alt+H' },
];

const isEditableElement = (el: Element | null): boolean => {
  if (!el) return false;
  const tagName = el.tagName.toLowerCase();
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    (el as HTMLElement).isContentEditable
  );
};

export function useNavigationShortcuts() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only proceed if Alt is pressed without Ctrl or Meta (Command)
      if (!e.altKey || e.ctrlKey || e.metaKey) {
        return;
      }

      // Ignore when typing inside input/textarea/editable elements
      if (isEditableElement(document.activeElement)) {
        return;
      }

      const pressedKey = e.key.toLowerCase();
      const pressedCode = e.code;

      const match = NAVIGATION_SHORTCUTS.find(
        (s) => s.key === pressedKey || s.code === pressedCode
      );

      if (match) {
        e.preventDefault();
        e.stopPropagation();

        if (pathname !== match.route) {
          router.push(match.route);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [router, pathname]);
}
