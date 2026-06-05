'use client';

import { EmailNodeData } from './types';

const FWD_RE = /^((fwd|fw|tr|forward)(\[\d+\])?:\s*)+/i;

function getBadge(messageId: string, threadRootId: string, subject: string) {
  if (messageId === threadRootId) return { text: 'Thread Root', bg: 'color-mix(in srgb, var(--color-primary) 15%, var(--color-surface-raised))', color: 'var(--color-primary)' };
  if (FWD_RE.test(subject)) return { text: 'Forward', bg: 'color-mix(in srgb, #EC4899 15%, var(--color-surface-raised))', color: '#EC4899' };
  return { text: 'Reply', bg: 'color-mix(in srgb, #4C9EF0 15%, var(--color-surface-raised))', color: '#4C9EF0' };
}

function formatSenderDisplay(from: string) {
  if (from.includes('<')) return from.substring(0, from.indexOf('<')).trim() || from;
  return from.split('@')[0];
}

interface ItemProps {
  item: Record<string, unknown>;
  isActive: boolean;
  isFirst: boolean;
  isLast: boolean;
  threadRootId: string;
  senderColors: Record<string, string>;
  onSelect: () => void;
}

function TimelineItem({ item, isActive, isFirst, isLast, threadRootId, senderColors, onSelect }: ItemProps) {
  const msgId = item.messageId as string;
  const from = (item.from as string) || '';
  const fromColor = senderColors[from.toLowerCase()] || 'var(--color-text)';
  const badge = getBadge(msgId, threadRootId, item.subject as string);
  const bodyText = (item.body as string) || '';
  const bodySnippet = bodyText.length > 90 ? bodyText.slice(0, 87) + '...' : bodyText;
  const dateStr = item.date
    ? new Date(item.date as string).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'No Date';

  return (
    <div style={{ display: 'flex', gap: '0.875rem', position: 'relative' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20 }}>
        <div style={{ width: 2, flex: 1, background: isFirst ? 'transparent' : 'var(--color-surface-overlay)', minHeight: 10 }} />
        <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${fromColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isActive ? fromColor : 'var(--bg-base)', boxShadow: 'none', transition: 'all 0.2s ease', zIndex: 2 }}>
          {!isActive && <div style={{ width: 6, height: 6, borderRadius: '50%', background: fromColor }} />}
        </div>
        <div style={{ width: 2, flex: 2, background: isLast ? 'transparent' : 'var(--color-surface-overlay)', minHeight: 20 }} />
      </div>

      <div
        onClick={onSelect}
        style={{ flex: 1, padding: '0.75rem', background: isActive ? 'color-mix(in srgb, var(--color-primary) 12%, var(--color-surface-raised))' : 'var(--color-surface)', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', marginBottom: '1rem', transition: 'all var(--transition-fast)', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}
        onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = 'var(--color-surface-hover)'; } }}
        onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = 'var(--color-surface)'; } }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: fromColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}>
            {formatSenderDisplay(from)}
          </span>
          <span style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{dateStr}</span>
        </div>

        <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-text)', lineHeight: 1.2 }}>{item.subject as string}</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <span style={{ fontSize: '0.625rem', background: badge.bg, color: badge.color, padding: '1px 6px', borderRadius: 'var(--radius-sm)', fontWeight: 500 }}>{badge.text}</span>
          {(item.attachments as unknown[])?.length > 0 && (
            <span style={{ fontSize: '0.625rem', background: 'var(--color-surface-input)', color: 'var(--color-text)', padding: '1px 5px', borderRadius: 'var(--radius-sm)' }}>
              {(item.attachments as unknown[]).length}
            </span>
          )}
        </div>

        {bodySnippet && (
          <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', lineHeight: 1.3, marginTop: 2, background: 'var(--color-surface-input)', padding: '4px 6px', borderRadius: 'var(--radius)', wordBreak: 'break-all' }}>
            {bodySnippet}
          </div>
        )}
      </div>
    </div>
  );
}

interface Props {
  currentEmail: EmailNodeData;
  threadEmails: Record<string, unknown>[];
  threadRootId: string;
  senderColors: Record<string, string>;
  onSelectEmail: (email: Record<string, unknown>) => void;
}

export default function EmailThreadTimeline({ currentEmail, threadEmails, threadRootId, senderColors, onSelectEmail }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {threadEmails.map((item, idx) => (
        <TimelineItem
          key={item.messageId as string}
          item={item}
          isActive={item.messageId === currentEmail.messageId}
          isFirst={idx === 0}
          isLast={idx === threadEmails.length - 1}
          threadRootId={threadRootId}
          senderColors={senderColors}
          onSelect={() => onSelectEmail(item)}
        />
      ))}
    </div>
  );
}
