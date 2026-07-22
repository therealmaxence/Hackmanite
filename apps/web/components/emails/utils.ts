import { useMemo } from 'react';
import { EmailNodeData, LayoutType } from './types';

export function getLayoutConfig(type: LayoutType) {
  return type === 'breadthfirst'
    ? { name: 'breadthfirst' as const, directed: true, circle: false, spacingFactor: 2.5, animate: true, animationDuration: 500, fit: true, padding: 40 }
    : { name: 'cose-bilkent' as const, animate: true, animationDuration: 600, nodeDimensionsIncludeLabels: true, idealEdgeLength: 260, nodeRepulsion: 25000, gravity: 0.05, numIter: 1000, fit: true, padding: 30 };
}

export function useSenderColors(senders: string[]): Record<string, string> {
  return useMemo(() => {
    const colors: Record<string, string> = {};
    senders.forEach((sender, idx) => {
      colors[sender.toLowerCase()] = `hsl(${170 + ((idx * 137.5) % 180)}, 85%, 65%)`;
    });
    return colors;
  }, [senders]);
}

export function collectThreadMessageIds(rootId: string, edges: Array<{ data: { source: string; target: string } }>): Set<string> {
  const collected = new Set<string>([rootId]);
  let frontier = [rootId];
  while (frontier.length > 0) {
    const nextFrontier: string[] = [];
    for (const parentId of frontier) {
      edges.forEach((edge) => {
        if (edge.data.source === parentId && !collected.has(edge.data.target)) {
          collected.add(edge.data.target);
          nextFrontier.push(edge.data.target);
        }
      });
    }
    frontier = nextFrontier;
  }
  return collected;
}

export function findThreadRoot(messageId: string, edges: Array<{ data: { source: string; target: string } }>): string {
  let rootId = messageId;
  const visited = new Set<string>([rootId]);
  while (true) {
    const parentEdge = edges.find((e) => e.data.target === rootId);
    if (parentEdge && parentEdge.data.source !== rootId && !visited.has(parentEdge.data.source)) {
      rootId = parentEdge.data.source;
      visited.add(rootId);
    } else {
      break;
    }
  }
  return rootId;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(1)) + ' ' + ['Bytes', 'KB', 'MB', 'GB'][i];
}

export function emailToNodeData(email: Record<string, unknown>): EmailNodeData {
  let attachments: any[] = [];
  try {
    attachments = typeof email.attachments === 'string' ? JSON.parse(email.attachments) : Array.isArray(email.attachments) ? email.attachments : [];
  } catch {
    attachments = [];
  }
  return {
    id: email.messageId as string,
    label: '',
    fullLabel: email.subject as string,
    type: 'EMAIL_NODE',
    from: email.from as string,
    to: email.to as string,
    cc: email.cc as string | null,
    date: email.date as string | null,
    subject: email.subject as string,
    body: email.body as string,
    attachments,
    fileName: (email as any).file?.originalName || 'Unknown file',
    messageId: email.messageId as string,
    inReplyTo: email.inReplyTo as string | null,
    references: email.references as string | null,
  };
}

