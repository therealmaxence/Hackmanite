'use client';

import { useState, useMemo } from 'react';
import { EmailNodeData } from './types';
import { useTranslation } from '@/lib/i18n';

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
  const { t } = useTranslation();

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
        {email.date ? new Date(email.date as string).toLocaleDateString() : t('emails.timeline.no_date')}
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

type SortField = 'date' | 'from' | 'to' | 'subject' | 'source';
type SortOrder = 'asc' | 'desc';

export default function EmailListView({
  emails,
  selectedEmail,
  senderColors,
  onSelectEmail,
}: EmailListViewProps) {
  const { t } = useTranslation();
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedEmails = useMemo(() => {
    const sorted = [...emails];
    sorted.sort((a, b) => {
      let valA: string | number = 0;
      let valB: string | number = 0;

      if (sortField === 'date') {
        valA = a.date ? new Date(a.date as string).getTime() : 0;
        valB = b.date ? new Date(b.date as string).getTime() : 0;
      } else if (sortField === 'from') {
        valA = ((a.from as string) || '').toLowerCase();
        valB = ((b.from as string) || '').toLowerCase();
      } else if (sortField === 'to') {
        valA = ((a.to as string) || '').toLowerCase();
        valB = ((b.to as string) || '').toLowerCase();
      } else if (sortField === 'subject') {
        valA = ((a.subject as string) || '').toLowerCase();
        valB = ((b.subject as string) || '').toLowerCase();
      } else if (sortField === 'source') {
        valA = (((a as any).file?.originalName || 'pst_source') as string).toLowerCase();
        valB = (((b as any).file?.originalName || 'pst_source') as string).toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [emails, sortField, sortOrder]);

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? ' ▲' : ' ▼';
  };

  return (
    <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', background: 'var(--bg-base)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
          {t('emails.list.ledger')}
        </h3>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', background: 'var(--color-surface-raised)', padding: '2px 8px', borderRadius: 'var(--radius-sm)' }}>
          {t('emails.list.matching_records', { count: sortedEmails.length })}
        </span>
      </div>

      <div style={{ border: 'none', borderRadius: 'var(--radius)', overflow: 'hidden', background: 'var(--color-surface)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
          <thead>
            <tr style={{ background: 'var(--color-surface-raised)', borderBottom: 'none' }}>
              {[
                { label: t('emails.list.col_date'), field: 'date' as SortField },
                { label: t('emails.list.col_from'), field: 'from' as SortField },
                { label: t('emails.list.col_to'), field: 'to' as SortField },
                { label: t('emails.list.col_subject'), field: 'subject' as SortField },
                { label: t('emails.list.col_source'), field: 'source' as SortField },
              ].map((col) => (
                <th
                  key={col.field}
                  onClick={() => handleSort(col.field)}
                  style={{
                    padding: '0.75rem 1rem',
                    color: 'var(--color-text-muted)',
                    fontWeight: 500,
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  {col.label}
                  {renderSortIndicator(col.field)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedEmails.map((email) => {
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

