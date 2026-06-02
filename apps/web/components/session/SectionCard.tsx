import React from 'react';

interface SectionCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export default function SectionCard({ title, description, children }: SectionCardProps) {
  return (
    <div style={{
      background: 'rgba(10, 12, 16, 0.5)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius)',
      padding: '2rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem',
    }}>
      <div>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text)', margin: 0, marginBottom: '0.375rem' }}>
          {title}
        </h2>
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
          {description}
        </p>
      </div>
      {children}
    </div>
  );
}
