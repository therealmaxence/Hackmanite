import { SessionExportResponse } from '@/types/api';
import { downloadBlob } from '@/lib/download';
import { buildGraphML } from '@/lib/graphml';

export { buildGraphML } from '@/lib/graphml';

export async function exportSessionAsJson(sessionId: string): Promise<void> {
  const res = await fetch(`/api/session/${sessionId}/export`);
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Export failed');
  const data: SessionExportResponse = await res.json();
  downloadJsonData(data, sessionId);
}

export function downloadJsonData(data: SessionExportResponse, sessionId: string): void {
  downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `session-${sessionId}-export.json`);
}

export function downloadGraphmlData(data: SessionExportResponse, sessionId: string): void {
  const xml = buildGraphML(data);
  downloadBlob(new Blob([xml], { type: 'application/xml' }), `session-${sessionId}-export.graphml`);
}

export default exportSessionAsJson;
