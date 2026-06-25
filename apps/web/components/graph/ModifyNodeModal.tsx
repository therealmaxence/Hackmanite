'use client';

import { useState, useEffect } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { EntityType } from '@/types/entities';

interface Props {
  nodeId: string;
  nodeType: string;
  initialEmailData?: any;
  sessionId: string;
  onClose: () => void;
  onSaveSuccess?: (newId?: string) => void;
}

const ENTITY_TYPES = [
  'PERSON',
  'ORGANIZATION',
  'LOCATION',
  'EMAIL',
  'PHONE',
  'IP_ADDRESS',
  'URL',
  'DATE',
  'ADDRESS',
];

function FormField({ label, ...props }: { label: string; [key: string]: any }) {
  const commonStyle = {
    background: 'var(--color-surface-raised)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text)',
    padding: '8px 12px',
    fontSize: '0.85rem',
    outline: 'none',
    width: '100%',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
      <label style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{label}</label>
      {props.type === 'textarea' ? (
        <textarea {...props} style={{ ...commonStyle, resize: 'vertical', ...props.style }} />
      ) : (
        <input {...props} style={{ ...commonStyle, ...props.style }} />
      )}
    </div>
  );
}

export default function ModifyNodeModal({
  nodeId,
  nodeType,
  initialEmailData,
  sessionId,
  onClose,
  onSaveSuccess,
}: Props) {
  const { mutate } = useSWRConfig();
  const isEmailNode = nodeType === 'EMAIL_NODE';

  const { data: entityData, isLoading: entityLoading } = useSWR(
    !isEmailNode && nodeId && sessionId
      ? `/api/entities/${nodeId}?sessionId=${sessionId}`
      : null,
    (url) => fetch(url).then((r) => r.json())
  );

  const [displayName, setDisplayName] = useState('');
  const [canonical, setCanonical] = useState('');
  const [type, setType] = useState<EntityType>('PERSON');
  const [occurrences, setOccurrences] = useState<any[]>([]);

  const [subject, setSubject] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [date, setDate] = useState('');
  const [body, setBody] = useState('');
  const [emailFileName, setEmailFileName] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEmailNode && initialEmailData) {
      setSubject(initialEmailData.subject || '');
      setFrom(initialEmailData.from || '');
      setTo(initialEmailData.to || '');
      setCc(initialEmailData.cc || '');
      setDate(initialEmailData.date ? new Date(initialEmailData.date).toISOString().slice(0, 16) : '');
      setBody(initialEmailData.body || '');
      setEmailFileName(initialEmailData.fileName || '');
    }
  }, [isEmailNode, initialEmailData]);

  useEffect(() => {
    if (!isEmailNode && entityData) {
      setDisplayName(entityData.displayName || '');
      setCanonical(entityData.canonical || '');
      setType(entityData.type || 'PERSON');
      setOccurrences(
        entityData.files?.map((f: any) => ({
          fileId: f.fileId,
          fileName: f.fileName,
          count: f.count,
          tfidf: f.tfidf ?? 0.0,
        })) || []
      );
    }
  }, [isEmailNode, entityData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm('Are you sure you want to save these changes? This will modify the database permanently and may change node identifiers.')) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      if (isEmailNode) {
        const res = await fetch(`/api/emails/${nodeId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject,
            from,
            to,
            cc,
            date: date || null,
            body,
            fileName: emailFileName,
          }),
        });
        if (!res.ok) throw new Error('Failed to update email node');
        
        mutate((key: unknown) => typeof key === 'string' && key.includes('/api/emails'));
        if (onSaveSuccess) onSaveSuccess();
      } else {
        const uniqueFileNames = occurrences.map((o) => ({ fileId: o.fileId, fileName: o.fileName }));
        const res = await fetch(`/api/entities/${nodeId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            displayName,
            canonical,
            type,
            occurrences: occurrences.map((o) => ({
              fileId: o.fileId,
              count: o.count,
              tfidf: o.tfidf,
            })),
            files: uniqueFileNames,
            sessionId,
          }),
        });
        if (!res.ok) throw new Error('Failed to update entity node');
        const result = await res.json();
        
        mutate((key: unknown) => typeof key === 'string' && (key.includes('/api/graph/') || key.includes('/api/stats')));
        if (onSaveSuccess) onSaveSuccess(result.newId);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred during update');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOccCountChange = (index: number, val: number) => {
    const next = [...occurrences];
    next[index].count = val;
    setOccurrences(next);
  };

  const handleOccTfidfChange = (index: number, val: number) => {
    const next = [...occurrences];
    next[index].tfidf = val;
    setOccurrences(next);
  };

  const handleOccFileNameChange = (index: number, val: string) => {
    const next = [...occurrences];
    next[index].fileName = val;
    setOccurrences(next);
  };

  const loading = !isEmailNode && entityLoading;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10000,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          width: '100%',
          maxWidth: '650px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '1.25rem 1.5rem', background: 'var(--color-surface-raised)', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
            {isEmailNode ? 'Modify Email Node' : 'Modify Entity Node'}
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSave} style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <Spinner />
            </div>
          ) : (
            <>
              {error && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
                  {error}
                </div>
              )}

              {isEmailNode ? (
                <>
                  <FormField label="Subject" value={subject} onChange={(e: any) => setSubject(e.target.value)} required />
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <FormField label="From" value={from} onChange={(e: any) => setFrom(e.target.value)} required />
                    <FormField label="To" value={to} onChange={(e: any) => setTo(e.target.value)} required />
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <FormField label="CC" value={cc} onChange={(e: any) => setCc(e.target.value)} />
                    <FormField label="Date" type="datetime-local" value={date} onChange={(e: any) => setDate(e.target.value)} />
                  </div>
                  
                  <FormField label="Body" type="textarea" value={body} onChange={(e: any) => setBody(e.target.value)} rows={5} required />
                  <FormField label="Associated File Name" value={emailFileName} onChange={(e: any) => setEmailFileName(e.target.value)} />
                </>
              ) : (
                <>
                  <FormField label="Display Name" value={displayName} onChange={(e: any) => setDisplayName(e.target.value)} required />
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <FormField label="Canonical Name" value={canonical} onChange={(e: any) => setCanonical(e.target.value)} required />
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                      <label style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Entity Type</label>
                      <select
                        value={type}
                        onChange={(e: any) => setType(e.target.value as EntityType)}
                        style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)', padding: '8px 12px', fontSize: '0.85rem', outline: 'none', height: '37px', width: '100%' }}
                      >
                        {ENTITY_TYPES.map((t) => (
                          <option key={t} value={t} style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {occurrences.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '0.5rem' }}>
                      <label style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Occurrences per File</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto', paddingRight: '4px' }}>
                        {occurrences.map((occ, idx) => (
                          <div
                            key={occ.fileId}
                            style={{
                              background: 'var(--color-surface-raised)',
                              border: '1px solid var(--color-border)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '10px 12px',
                              display: 'grid',
                              gridTemplateColumns: '2fr 1fr 1fr',
                              gap: '10px',
                              alignItems: 'center',
                            }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>FILE NAME</span>
                              <input
                                type="text"
                                value={occ.fileName}
                                onChange={(e: any) => handleOccFileNameChange(idx, e.target.value)}
                                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-text)', padding: '4px 6px', fontSize: '0.75rem', outline: 'none' }}
                                required
                              />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>OCCURRENCES</span>
                              <input
                                type="number"
                                min={1}
                                value={occ.count}
                                onChange={(e: any) => handleOccCountChange(idx, parseInt(e.target.value) || 1)}
                                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-text)', padding: '4px 6px', fontSize: '0.75rem', outline: 'none' }}
                                required
                              />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>TF-IDF</span>
                              <input
                                type="number"
                                step="any"
                                min={0}
                                value={occ.tfidf}
                                onChange={(e: any) => handleOccTfidfChange(idx, parseFloat(e.target.value) || 0)}
                                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-text)', padding: '4px 6px', fontSize: '0.75rem', outline: 'none' }}
                                required
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {!loading && (
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem', marginTop: 'auto', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <Button size="sm" variant="ghost" onClick={onClose} disabled={isSaving} type="button">
                Cancel
              </Button>
              <Button size="sm" variant="primary" loading={isSaving} type="submit">
                Validate
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
