// ─── Email DAG builder ────────────────────────────────────────────────────────

type EmailRow = {
  messageId: string;
  subject: string;
  from: string;
  to: string;
  cc: string | null;
  date: Date | null;
  body: string;
  attachments: unknown;
  inReplyTo: string | null;
  references: string | null;
  file?: { originalName: string } | null;
};

const FORWARD_PATTERN = /^((fwd|fw|tr|forward)(\[\d+\])?:\s*)+/i;
const CLEAN_PATTERN = /^((re|fwd|fw|tr|aw|wg|antw|rif|reply|forward)(\[\d+\])?:\s*)+/i;

function relationType(subject: string) {
  return FORWARD_PATTERN.test(subject) ? 'FORWARD' : 'REPLY';
}

function cleanSubject(subject: string) {
  return subject.replace(CLEAN_PATTERN, '').trim().toLowerCase();
}

function curveDistance(sourceIdx: number | undefined, targetIdx: number | undefined): number {
  if (sourceIdx === undefined || targetIdx === undefined) return 0;
  const steps = Math.abs(targetIdx - sourceIdx);
  if (steps <= 1) return 0;
  const direction = sourceIdx % 2 === 0 ? 1 : -1;
  return (steps - 1) * 35 * direction;
}

export function buildEmailDAG(emails: EmailRow[]) {
  const messageIdSet = new Set(emails.map((e) => e.messageId));
  const indexMap = new Map<string, number>(emails.map((e, i) => [e.messageId, i]));

  const nodes: unknown[] = [];
  const edges: unknown[] = [];
  const sendersSet = new Set<string>();
  const recipientsSet = new Set<string>();
  const hasParentSet = new Set<string>();
  let totalAttachments = 0;

  for (const email of emails) {
    if (email.from) sendersSet.add(email.from.trim().toLowerCase());

    for (const addr of email.to.split(',').map((a) => a.trim().toLowerCase())) {
      if (addr) recipientsSet.add(addr);
    }
    if (email.cc) {
      for (const addr of email.cc.split(',').map((a) => a.trim().toLowerCase())) {
        if (addr) recipientsSet.add(addr);
      }
    }

    const attachments: unknown[] =
      typeof email.attachments === 'string'
        ? JSON.parse(email.attachments)
        : (email.attachments as unknown[]) || [];
    totalAttachments += attachments.length;

    const displayLabel =
      email.subject.length > 25 ? email.subject.slice(0, 23) + '...' : email.subject;
    const fromDisplay = email.from.includes('<')
      ? email.from.substring(0, email.from.indexOf('<')).trim() || email.from
      : email.from.split('@')[0];

    nodes.push({
      data: {
        id: email.messageId,
        label: `${fromDisplay}\n"${displayLabel}"`,
        fullLabel: email.subject,
        type: 'EMAIL_NODE',
        from: email.from,
        to: email.to,
        cc: email.cc,
        date: email.date?.toISOString() || null,
        subject: email.subject,
        body: email.body,
        attachments,
        fileName: email.file?.originalName || 'Unknown file',
        messageId: email.messageId,
        inReplyTo: email.inReplyTo,
        references: email.references,
      },
    });

    // Thread via inReplyTo
    if (email.inReplyTo && messageIdSet.has(email.inReplyTo)) {
      edges.push({
        data: {
          id: `email-edge-${email.inReplyTo}-to-${email.messageId}`,
          source: email.inReplyTo,
          target: email.messageId,
          weight: 1.0,
          type: relationType(email.subject),
          curveDistance: curveDistance(indexMap.get(email.inReplyTo), indexMap.get(email.messageId)),
        },
      });
      hasParentSet.add(email.messageId);
      continue;
    }

    if (email.references) {
      const refIds = email.references.split(/\s+/).filter(Boolean);
      for (let i = refIds.length - 1; i >= 0; i--) {
        const ancestorId = refIds[i];
        if (messageIdSet.has(ancestorId)) {
          edges.push({
            data: {
              id: `email-edge-ref-${ancestorId}-to-${email.messageId}`,
              source: ancestorId,
              target: email.messageId,
              weight: 0.8,
              type: relationType(email.subject),
              curveDistance: curveDistance(indexMap.get(ancestorId), indexMap.get(email.messageId)),
            },
          });
          hasParentSet.add(email.messageId);
          break;
        }
      }
    }
  }

  const subjectGroups = new Map<string, EmailRow[]>();
  for (const email of emails) {
    const clean = cleanSubject(email.subject);
    if (clean) {
      const group = subjectGroups.get(clean) ?? [];
      group.push(email);
      subjectGroups.set(clean, group);
    }
  }

  for (const email of emails) {
    if (hasParentSet.has(email.messageId)) continue;
    const clean = cleanSubject(email.subject);
    const group = subjectGroups.get(clean);
    if (!group || group.length <= 1) continue;
    const idx = group.findIndex((e) => e.messageId === email.messageId);
    if (idx <= 0) continue;
    if (!CLEAN_PATTERN.test(email.subject)) continue;

    const ancestor = group[idx - 1];
    edges.push({
      data: {
        id: `email-edge-subject-${ancestor.messageId}-to-${email.messageId}`,
        source: ancestor.messageId,
        target: email.messageId,
        weight: 0.6,
        type: relationType(email.subject),
        curveDistance: curveDistance(indexMap.get(ancestor.messageId), indexMap.get(email.messageId)),
      },
    });
    hasParentSet.add(email.messageId);
  }

  const childNodeIds = new Set((edges as { data: { target: string } }[]).map((e) => e.data.target));
  const totalThreads = emails.filter((e) => !childNodeIds.has(e.messageId)).length;

  return {
    dag: { nodes, edges },
    stats: {
      totalEmails: emails.length,
      totalSenders: sendersSet.size,
      totalRecipients: recipientsSet.size,
      totalAttachments,
      totalThreads,
    },
  };
}
