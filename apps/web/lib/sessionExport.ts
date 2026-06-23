import { SessionExportResponse } from '@/types/api';

export async function exportSessionAsJson(sessionId: string): Promise<void> {
  const res = await fetch(`/api/session/${sessionId}/export`);
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Export failed');
  downloadJsonData(await res.json(), sessionId);
}

export function downloadJsonData(data: any, sessionId: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `session-${sessionId}-export.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default exportSessionAsJson;
