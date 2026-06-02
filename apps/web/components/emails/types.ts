// Shared types for the Emails feature

export interface Attachment {
  filename: string;
  size: number;
  entities?: {
    canonical: string;
    type: string;
  }[];
}

export interface EmailNodeData {
  id: string;
  label: string;
  fullLabel: string;
  type: string;
  from: string;
  to: string;
  cc?: string | null;
  date?: string | null;
  subject: string;
  body: string;
  attachments: Attachment[];
  fileName: string;
  messageId: string;
  inReplyTo?: string | null;
  references?: string | null;
  color?: string;
}

export interface CytoscapeElement {
  data: Record<string, unknown>;
  classes?: string;
}

export interface EmailStats {
  totalEmails: number;
  totalSenders: number;
  totalRecipients: number;
  totalAttachments: number;
  totalThreads: number;
}

export type LayoutType = 'breadthfirst' | 'cose-bilkent';
export type ActiveTab = 'graph' | 'list';
