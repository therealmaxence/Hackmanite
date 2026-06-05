import { useMemo } from 'react';
import { EmailNodeData, LayoutType } from './types';

/**
 * Returns Cytoscape layout configuration based on layout type.
 */
export function getLayoutConfig(type: LayoutType) {
  if (type === 'breadthfirst') {
    return {
      name: 'breadthfirst' as const,
      directed: true,
      circle: false,
      spacingFactor: 2.5,
      animate: true,
      animationDuration: 500,
      fit: true,
      padding: 40,
    };
  }
  return {
    name: 'cose-bilkent' as const,
    animate: true,
    animationDuration: 600,
    nodeDimensionsIncludeLabels: true,
    idealEdgeLength: 260,
    nodeRepulsion: 25000,
    gravity: 0.05,
    numIter: 1000,
    fit: true,
    padding: 30,
  };
}

/**
 * Assigns a distinct HSL color to each sender email address.
 */
export function useSenderColors(senders: string[]): Record<string, string> {
  return useMemo(() => {
    const colors: Record<string, string> = {};
    senders.forEach((sender, idx) => {
      // Confining hues to the UV fluorescent spectrum [170, 350] (cyan to rose)
      // and using golden angle distribution to distribute them beautifully.
      const hue = 170 + ((idx * 137.5) % 180);
      colors[sender.toLowerCase()] = `hsl(${hue}, 85%, 65%)`;
    });
    return colors;
  }, [senders]);
}

/**
 * Collects the transitive set of messageIds in a conversation thread
 * starting from a given root message ID, walking down the reply tree.
 */
export function collectThreadMessageIds(
  rootId: string,
  edges: Array<{ data: { source: string; target: string } }>
): Set<string> {
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

/**
 * Finds the root messageId of a thread by walking up from a given messageId.
 */
export function findThreadRoot(
  messageId: string,
  edges: Array<{ data: { source: string; target: string } }>
): string {
  let rootId = messageId;
  const visited = new Set<string>([rootId]);
  let checking = true;

  while (checking) {
    const parentEdge = edges.find((e) => e.data.target === rootId);
    if (parentEdge && parentEdge.data.source !== rootId && !visited.has(parentEdge.data.source)) {
      rootId = parentEdge.data.source;
      visited.add(rootId);
    } else {
      checking = false;
    }
  }

  return rootId;
}

/**
 * Formats a byte count as a human-readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Converts a raw email DB record to an EmailNodeData object.
 */
export function emailToNodeData(email: Record<string, unknown>): EmailNodeData {
  let parsedAttachments: any[] = [];
  if (typeof email.attachments === 'string') {
    try {
      parsedAttachments = JSON.parse(email.attachments);
    } catch {
      parsedAttachments = [];
    }
  } else if (Array.isArray(email.attachments)) {
    parsedAttachments = email.attachments;
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
    attachments: parsedAttachments,
    fileName: (email as any).file?.originalName || 'Unknown file',
    messageId: email.messageId as string,
    inReplyTo: email.inReplyTo as string | null,
    references: email.references as string | null,
  };
}
