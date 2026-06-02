import { SessionExportResponse } from '@/types/api';

export async function exportSessionAsJson(sessionId: string): Promise<void> {
  const res = await fetch(`/api/session/${sessionId}/export`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Export failed');
  }

  const data: SessionExportResponse = await res.json();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `session-${sessionId}-export.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default exportSessionAsJson;
