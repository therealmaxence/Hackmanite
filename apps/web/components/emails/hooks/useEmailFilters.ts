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

/**
 * Computes the filtered list of emails based on all active filters:
 * thread focus, sender, recipient, and full-text search.
 */
export function useEmailFilters({
  rawEmails,
  rawEdges,
  focusedThreadRootId,
  senderFilter,
  recipientFilter,
  searchQuery,
}: UseEmailFiltersProps) {
  // Derive the set of message IDs in the focused thread (if any)
  const focusedThreadMsgIds = useMemo(() => {
    if (!focusedThreadRootId) return null;
    return collectThreadMessageIds(focusedThreadRootId, rawEdges);
  }, [focusedThreadRootId, rawEdges]);

  // Derive unique senders and recipients for filter dropdowns
  const filterOptions = useMemo(() => {
    const senders = new Set<string>();
    const recipients = new Set<string>();

    rawEmails.forEach((email) => {
      const from = email.from as string;
      const to = email.to as string;
      const cc = email.cc as string | undefined;

      if (from) senders.add(from.trim());
      if (to) {
        to.split(',').forEach((addr) => {
          const trimmed = addr.trim();
          if (trimmed) recipients.add(trimmed);
        });
      }
      if (cc) {
        cc.split(',').forEach((addr) => {
          const trimmed = addr.trim();
          if (trimmed) recipients.add(trimmed);
        });
      }
    });

    return {
      senders: Array.from(senders).sort(),
      recipients: Array.from(recipients).sort(),
    };
  }, [rawEmails]);

  // Apply all active filters to the raw email list
  const filteredEmails = useMemo(() => {
    return rawEmails.filter((email) => {
      const msgId = email.messageId as string;
      const from = (email.from as string) || '';
      const to = (email.to as string) || '';
      const cc = (email.cc as string) || '';
      const subject = (email.subject as string) || '';
      const body = (email.body as string) || '';

      // 1. Thread isolation
      if (focusedThreadMsgIds && !focusedThreadMsgIds.has(msgId)) return false;

      // 2. Sender dropdown filter
      if (senderFilter !== 'all' && from !== senderFilter) return false;

      // 3. Recipient dropdown filter
      if (recipientFilter !== 'all') {
        const toList = to.split(',').map((r) => r.trim());
        const ccList = cc.split(',').map((r) => r.trim());
        if (!toList.includes(recipientFilter) && !ccList.includes(recipientFilter)) return false;
      }

      // 4. Full-text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          subject.toLowerCase().includes(q) ||
          body.toLowerCase().includes(q) ||
          from.toLowerCase().includes(q) ||
          to.toLowerCase().includes(q) ||
          cc.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [rawEmails, focusedThreadMsgIds, senderFilter, recipientFilter, searchQuery]);

  return { filteredEmails, filterOptions };
}
