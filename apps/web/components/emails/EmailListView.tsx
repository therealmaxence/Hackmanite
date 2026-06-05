'use client';

import { useState } from 'react';
import { EmailNodeData } from './types';

interface EmailListViewProps {
  emails: Record<string, unknown>[];
  selectedEmail: EmailNodeData | null;
  senderColors: Record<string, string>;
  onSelectEmail: (email: Record<string, unknown>) => void;
}

interface EmailRowProps {
  email: Record<string, unknown>;
  isSelected: boolean;
  senderColors: Record<string, string>;
  onSelectEmail: (email: Record<string, unknown>) => void;
}

function EmailRow({ email, isSelected, senderColors, onSelectEmail }: EmailRowProps) {
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLTableRowElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const from = (email.from as string) || '';

  return (
    <tr
      onClick={() => onSelectEmail(email)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={handleMouseMove}
      style={{
        borderBottom: 'none',
        cursor: 'pointer',
        transition: isHovered ? 'none' : 'background 250ms ease',
        background: isSelected
          ? 'color-mix(in srgb, var(--color-secondary) 15%, var(--color-surface-raised))'
          : isHovered
          ? `var(--noise-bg), radial-gradient(circle 120px at ${coords.x}px ${coords.y}px, var(--color-surface-hover), var(--color-surface))`
          : 'var(--color-surface)',
      }}
    >
      <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
        {email.date ? new Date(email.date as string).toLocaleDateString() : 'No Date'}
      </td>
      <td style={{ padding: '0.75rem 1rem', fontWeight: 500, color: senderColors[from.toLowerCase()] || 'var(--color-text)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {from.includes('<') ? from.split('<')[0].trim() : from}
      </td>
      <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {email.to as string}
      </td>
      <td style={{ padding: '0.75rem 1rem', fontWeight: 500, color: 'var(--color-text)' }}>
        {email.subject as string}
        {(email.attachments as unknown[])?.length > 0 && (
          <span style={{ fontSize: '0.6875rem', background: 'color-mix(in srgb, #EC4899 12%, var(--color-surface-raised))', color: '#EC4899', padding: '1px 5px', borderRadius: 'var(--radius-sm)', marginLeft: '6px', whiteSpace: 'nowrap' }}>
            {(email.attachments as unknown[]).length}
          </span>
        )}
      </td>
      <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
        {(email as { file?: { originalName?: string } }).file?.originalName || 'pst_source'}
      </td>
    </tr>
  );
}

export default function EmailListView({
  emails,
  selectedEmail,
  senderColors,
  onSelectEmail,
}: EmailListViewProps) {
  return (
    <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', background: 'var(--bg-base)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
          Emails Thread Record Ledger
        </h3>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', background: 'var(--color-surface-raised)', padding: '2px 8px', borderRadius: 'var(--radius-sm)' }}>
          {emails.length} record(s) matching filters
        </span>
      </div>

      <div style={{ border: 'none', borderRadius: 'var(--radius)', overflow: 'hidden', background: 'var(--color-surface)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
          <thead>
            <tr style={{ background: 'var(--color-surface-raised)', borderBottom: 'none' }}>
              {['Date', 'From', 'To', 'Subject', 'Source File'].map((col) => (
                <th key={col} style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {emails.map((email) => {
              const msgId = email.messageId as string;
              const isSelected = selectedEmail?.messageId === msgId;
              return (
                <EmailRow
                  key={msgId}
                  email={email}
                  isSelected={isSelected}
                  senderColors={senderColors}
                  onSelectEmail={onSelectEmail}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

