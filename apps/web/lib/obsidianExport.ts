import { SessionExportResponse } from '@/types/api';
import { downloadBlob } from '@/lib/download';
import { buildObsidianZip } from './pipeline/obsidianBuilder';

interface EmailData {
  id: string;
  messageId: string;
  inReplyTo: string | null;
  references: string | null;
  subject: string;
  from: string;
  to: string;
  cc: string | null;
  date: string | null;
  body: string;
  attachments: string | null;
  fileId: string | null;
  fileName: string | null;
}

type ExtendedSessionExportResponse = SessionExportResponse & { emails?: EmailData[] };

export async function exportSessionAsObsidian(sessionId: string): Promise<void> {
  const res = await fetch(`/api/session/${sessionId}/export`);
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Export failed');
  await generateAndDownloadObsidianZip(await res.json(), sessionId);
}

export async function generateAndDownloadObsidianZip(
  data: ExtendedSessionExportResponse,
  sessionId: string
): Promise<void> {
  const zip = buildObsidianZip(data);
  downloadBlob(await zip.generateAsync({ type: 'blob' }), `session-${sessionId}-obsidian.zip`);
}

export default exportSessionAsObsidian;
