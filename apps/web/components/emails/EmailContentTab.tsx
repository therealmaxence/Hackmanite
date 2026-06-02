'use client';

import { useState } from 'react';
import { EmailNodeData, Attachment } from './types';
import { formatBytes } from './utils';

const BODY_SPLIT_RE = /(?:\r?\n)*(?:On\s+.*,\s+.*wrote:|> On\s+.*,\s+.*wrote:|Le\s+.*,\s+.*a\s+écrit\s*:|> Le\s+.*,\s+.*a\s+écrit\s*:|---*\s*(?:Original\s+Message|Message\s+d'origine|Исходное\s+сообщение)\s*---*|(?:\r?\n|^)From:\s+.*(?:\r?\n)Sent:\s+.*|(?:\r?\n|^)De\s*:\s+.*(?:\r?\n)Envoyé\s*:\s+.*|(?:\r?\n|^)От\s*:\s+.*(?:\r?\n)(?:Отправлено|Дата)\s*:\s+.*|.*\b(?:пишет|написал\(а\)|написал|написала)\b\s*:(?:\s*\r?\n)?)/i;

function splitBody(body: string): { message: string; quoted: string } {
  if (!body) return { message: '', quoted: '' };

  const match = body.match(BODY_SPLIT_RE);
  if (match?.index !== undefined) {
    return { message: body.slice(0, match.index).trim(), quoted: body.slice(match.index).trim() };
  }

  const lines = body.split(/\r?\n/);
  const firstQuoteIdx = lines.findIndex((l) => l.trim().startsWith('>'));
  if (firstQuoteIdx > 0) {
    return {
      message: lines.slice(0, firstQuoteIdx).join('\n').trim(),
      quoted: lines.slice(firstQuoteIdx).join('\n').trim(),
    };
  }

  return { message: body.trim(), quoted: '' };
}

function HeaderField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.125rem' }}>
        {label}
      </span>
      {children}
    </div>
  );
}

function EmailBody({ body, fromColor }: { body: string; fromColor: string }) {
  const [showQuoted, setShowQuoted] = useState(false);
  const { message, quoted } = splitBody(body);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.4)', borderRadius: 'var(--radius)', borderLeft: '4px solid var(--color-border)', border: '1px solid var(--color-border)', borderLeftWidth: 4, fontSize: '0.8125rem', fontFamily: 'var(--font-mono)', color: '#E8EAF0', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word', minHeight: 60 }}>
        {message || '(No new message text found)'}
      </div>

      {quoted && (
        <div style={{ marginTop: '0.25rem' }}>
          <button
            onClick={() => setShowQuoted(!showQuoted)}
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '4px 8px', fontSize: '0.75rem', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.15s ease' }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
          >
            {showQuoted ? '▼ Hide Quoted History' : '► Show Quoted History'}
          </button>
          {showQuoted && (
            <div style={{ marginTop: '0.5rem', padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.6)', borderRadius: 'var(--radius)', border: '1px solid rgba(255,255,255,0.05)', borderLeft: '4px solid var(--color-border)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {quoted}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface Props {
  email: EmailNodeData;
  fromColor: string;
  isFocused: boolean;
  onFocusThread: () => void;
  onResetFocus: () => void;
  onDelete: () => void;
}

export default function EmailContentTab({ email, fromColor, isFocused, onFocusThread, onResetFocus, onDelete }: Props) {
  const [expandedAttachments, setExpandedAttachments] = useState<Record<number, boolean>>({});

  const toggleAttachment = (index: number) => {
    setExpandedAttachments((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  return (
    <>
      <div>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text)', margin: 0, lineHeight: 1.3 }}>{email.subject}</h2>
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.375rem', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>Source file:</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text)' }}>{email.fileName}</span>
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <HeaderField label="From">
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: fromColor, wordBreak: 'break-all' }}>{email.from}</span>
          </HeaderField>
        </div>
        <HeaderField label="To">
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-text)', wordBreak: 'break-all' }}>{email.to}</span>
        </HeaderField>
        {email.cc && (
          <HeaderField label="Cc">
            <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', wordBreak: 'break-all' }}>{email.cc}</span>
          </HeaderField>
        )}
        <HeaderField label="Date">
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-text)' }}>
            {email.date ? new Date(email.date).toUTCString() : 'No timestamp available'}
          </span>
        </HeaderField>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.625rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div style={{ overflow: 'hidden' }}>
            <span style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Message-ID</span>
            <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {email.messageId}
            </span>
          </div>
          <button onClick={() => navigator.clipboard.writeText(email.messageId)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 'var(--radius-sm)', padding: '2px 8px', fontSize: '0.6875rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Copy ID
          </button>
        </div>
      </div>

      {Array.isArray(email.attachments) && email.attachments.length > 0 && (
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.5rem' }}>
            Attachments
            <span style={{ fontSize: '0.6875rem', background: 'rgba(255,255,255,0.08)', color: 'var(--color-text)', padding: '1px 5px', borderRadius: 'var(--radius-sm)' }}>{email.attachments.length}</span>
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {email.attachments.map((file: Attachment, i: number) => {
              const hasEntities = file.entities && file.entities.length > 0;
              const isExpanded = !!expandedAttachments[i];

              const groupedEntities = file.entities ? file.entities.reduce((acc, curr) => {
                const type = curr.type;
                if (!acc[type]) acc[type] = [];
                acc[type].push(curr.canonical);
                return acc;
              }, {} as Record<string, string[]>) : {};

              return (
                <div key={i} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                  <div style={{ padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', gap: '0.5rem' }}>
                    <span style={{ color: 'var(--color-text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{file.filename}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{formatBytes(file.size)}</span>
                      {hasEntities && (
                        <button
                          onClick={() => toggleAttachment(i)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500, padding: 0 }}
                        >
                          {isExpanded ? '[Hide]' : '[Details]'}
                        </button>
                      )}
                    </div>
                  </div>
                  {hasEntities && isExpanded && (
                    <div style={{ padding: '0.75rem', borderTop: '1px solid var(--color-border)', background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {Object.entries(groupedEntities).map(([type, canonicals]) => {
                        let color = 'var(--color-text-muted)';
                        if (type === 'PERSON') color = 'var(--entity-person)';
                        else if (type === 'ORGANIZATION') color = 'var(--entity-org)';
                        else if (type === 'LOCATION') color = 'var(--entity-location)';

                        return (
                          <div key={type} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <span style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{type}</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                              {canonicals.map((name, idx) => (
                                <span
                                  key={idx}
                                  style={{
                                    display: 'inline-block',
                                    fontSize: '0.6875rem',
                                    padding: '2px 6px',
                                    border: '1px solid',
                                    borderRadius: 'var(--radius-sm)',
                                    background: 'rgba(255,255,255,0.02)',
                                    fontFamily: 'var(--font-mono)',
                                    color,
                                    borderColor: color
                                  }}
                                >
                                  {name}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {isFocused ? (
          <button onClick={onResetFocus} style={{ flex: 1, padding: '0.5rem', fontSize: '0.8125rem', fontWeight: 500, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 'var(--radius)', cursor: 'pointer' }}>
            Reset Graph View Focus
          </button>
        ) : (
          <button onClick={onFocusThread} style={{ flex: 1, padding: '0.5rem', fontSize: '0.8125rem', fontWeight: 500, background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 'var(--radius)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            Focus Thread Conversation DAG
          </button>
        )}
      </div>

      <div>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text)', display: 'block', marginBottom: '0.5rem' }}>Message Body</span>
        <EmailBody body={email.body} fromColor={fromColor} />
      </div>

      <div style={{ marginTop: '2.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem' }}>
        <button
          onClick={onDelete}
          style={{ width: '100%', padding: '0.875rem', background: 'transparent', border: '1px solid var(--color-error)', borderRadius: 'var(--radius)', color: 'var(--color-error)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all var(--transition-fast)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'color-mix(in srgb, var(--color-error) 12%, transparent)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          Delete Email Node from Graph
        </button>
      </div>
    </>
  );
}
