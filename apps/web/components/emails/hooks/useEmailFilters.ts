import { useMemo } from 'react';
import { collectThreadMessageIds } from '../utils';

interface UseEmailFiltersProps {
  rawEmails: Record<string, unknown>[];
  rawEdges: Array<{ data: { source: string; target: string } }>;
  focusedThreadRootId: string | null;
  senderFilter: string;
  recipientFilter: string;
  searchQuery: string;
}

export function useEmailFilters({ rawEmails, rawEdges, focusedThreadRootId, senderFilter, recipientFilter, searchQuery }: UseEmailFiltersProps) {
  const focusedThreadMsgIds = useMemo(() => focusedThreadRootId ? collectThreadMessageIds(focusedThreadRootId, rawEdges) : null, [focusedThreadRootId, rawEdges]);

  const filterOptions = useMemo(() => {
    const senders = new Set<string>(), recipients = new Set<string>();
    rawEmails.forEach((email) => {
      if (email.from) senders.add((email.from as string).trim());
      [email.to, email.cc].forEach((field) => {
        if (field) (field as string).split(',').forEach((addr) => {
          const trimmed = addr.trim();
          if (trimmed) recipients.add(trimmed);
        });
      });
    });
    return { senders: Array.from(senders).sort(), recipients: Array.from(recipients).sort() };
  }, [rawEmails]);

  const filteredEmails = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rawEmails.filter((email) => {
      const msgId = email.messageId as string;
      const from = (email.from as string) || '', to = (email.to as string) || '', cc = (email.cc as string) || '';
      const subject = (email.subject as string) || '', body = (email.body as string) || '';

      if (focusedThreadMsgIds && !focusedThreadMsgIds.has(msgId)) return false;
      if (senderFilter !== 'all' && from !== senderFilter) return false;
      if (recipientFilter !== 'all' && !to.split(',').map(r => r.trim()).includes(recipientFilter) && !cc.split(',').map(r => r.trim()).includes(recipientFilter)) return false;
      if (q) return subject.toLowerCase().includes(q) || body.toLowerCase().includes(q) || from.toLowerCase().includes(q) || to.toLowerCase().includes(q) || cc.toLowerCase().includes(q);
      return true;
    });
  }, [rawEmails, focusedThreadMsgIds, senderFilter, recipientFilter, searchQuery]);

  return { filteredEmails, filterOptions };
}

