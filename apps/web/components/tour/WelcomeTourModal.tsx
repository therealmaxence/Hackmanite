'use client';

import React from 'react';
import Image from 'next/image';
import { useTranslation, Language } from '@/lib/i18n';
import Button from '@/components/ui/Button';

interface WelcomeTourModalProps {
  isOpen: boolean;
  onStartTour: () => void;
  onSkipTour: () => void;
}

export default function WelcomeTourModal({
  isOpen,
  onStartTour,
  onSkipTour,
}: WelcomeTourModalProps) {
  const { language, setLanguage, t } = useTranslation();

  if (!isOpen) return null;

  const isEn = language === 'en';

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(5, 4, 7, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onSkipTour}
    >
      <div
        style={{
          background: 'var(--color-surface, #111014)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 'var(--radius, 6px)',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.75)',
          maxWidth: '460px',
          width: '100%',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Image
            src="/hackmanite_main_nobg.png"
            alt="Hackmanite"
            width={38}
            height={38}
            style={{ objectFit: 'contain' }}
          />
          <div>
            <h2
              style={{
                fontFamily: 'var(--font-heading, inherit)',
                fontSize: '1.15rem',
                fontWeight: 600,
                color: 'var(--color-text, #f0f0f4)',
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              {t('tour.modal.title')}
            </h2>
            <p
              style={{
                fontSize: '0.75rem',
                color: 'var(--color-text-muted, #80808c)',
                margin: '2px 0 0 0',
              }}
            >
              {t('tour.modal.subtitle')}
            </p>
          </div>
        </div>

        {/* Language Selection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--color-text-muted, #80808c)',
            }}
          >
            {t('tour.modal.language_prompt')}
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              style={{
                background: isEn ? 'var(--color-surface-overlay, #222129)' : 'var(--color-surface-raised, #18171c)',
                border: isEn ? '1px solid var(--color-primary, #7c3aed)' : '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: 'var(--radius-sm, 4px)',
                padding: '0.625rem 0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                fontSize: '0.85rem',
                fontWeight: isEn ? 600 : 400,
                color: isEn ? 'var(--color-text, #f0f0f4)' : 'var(--color-text-muted, #80808c)',
                cursor: 'pointer',
                transition: 'all 120ms ease',
              }}
            >
              <span style={{ fontSize: '1rem' }}>🇬🇧</span>
              English
            </button>
            <button
              type="button"
              onClick={() => setLanguage('fr')}
              style={{
                background: !isEn ? 'var(--color-surface-overlay, #222129)' : 'var(--color-surface-raised, #18171c)',
                border: !isEn ? '1px solid var(--color-primary, #7c3aed)' : '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: 'var(--radius-sm, 4px)',
                padding: '0.625rem 0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                fontSize: '0.85rem',
                fontWeight: !isEn ? 600 : 400,
                color: !isEn ? 'var(--color-text, #f0f0f4)' : 'var(--color-text-muted, #80808c)',
                cursor: 'pointer',
                transition: 'all 120ms ease',
              }}
            >
              <span style={{ fontSize: '1rem' }}>🇫🇷</span>
              Français
            </button>
          </div>
        </div>

        {/* Feature Overview Description */}
        <p
          style={{
            fontSize: '0.8125rem',
            lineHeight: 1.55,
            color: 'var(--color-text-muted, #80808c)',
            margin: 0,
            background: 'var(--color-surface-raised, #18171c)',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-sm, 4px)',
          }}
        >
          {t('tour.modal.desc')}
        </p>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.25rem' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={onSkipTour}
          >
            {t('tour.modal.skip_btn')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onStartTour}
          >
            {t('tour.modal.start_btn')}
          </Button>
        </div>
      </div>
    </div>
  );
}
