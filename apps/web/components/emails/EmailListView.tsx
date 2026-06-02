'use client';

import { EmailNodeData } from './types';

interface EmailListViewProps {
  emails: Record<string, unknown>[];
  selectedEmail: EmailNodeData | null;
  senderColors: Record<string, string>;
  onSelectEmail: (email: Record<string, unknown>) => void;
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
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 'var(--radius-sm)' }}>
          {emails.length} record(s) matching filters
        </span>
      </div>

      <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--color-border)' }}>
              {['Date', 'From', 'To', 'Subject', 'Source File'].map((col) => (
                <th key={col} style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {emails.map((email) => {
              const msgId = email.messageId as string;
              const isSelected = selectedEmail?.messageId === msgId;
              const from = (email.from as string) || '';

              return (
                <tr
                  key={msgId}
                  onClick={() => onSelectEmail(email)}
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    cursor: 'pointer',
                    background: isSelected ? 'color-mix(in srgb, var(--color-secondary) 10%, transparent)' : 'transparent',
                    transition: 'background 0.15s ease-in-out',
                  }}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.015)'; }}
                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
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
                      <span style={{ fontSize: '0.6875rem', background: 'rgba(236, 72, 153, 0.12)', color: '#EC4899', padding: '1px 5px', borderRadius: 'var(--radius-sm)', marginLeft: '6px', whiteSpace: 'nowrap' }}>
                        {(email.attachments as unknown[]).length}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                    {(email as { file?: { originalName?: string } }).file?.originalName || 'pst_source'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
