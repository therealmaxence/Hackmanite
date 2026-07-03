import { SessionExportResponse } from '@/types/api';
import { downloadBlob } from '@/lib/download';

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

export function buildGraphML(data: SessionExportResponse): string {
  const nodes = data.nodes || [];
  const edges = data.edges || [];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://graphml.graphdrawing.org/xmlns http://graphml.graphdrawing.org/xmlns/1.0/graphml.xsd">
  <key id="d0" for="node" attr.name="label" attr.type="string"/>
  <key id="d1" for="node" attr.name="type" attr.type="string"/>
  <key id="d2" for="node" attr.name="canonical" attr.type="string"/>
  <key id="d3" for="edge" attr.name="weight" attr.type="double"/>
  <graph id="G" edgedefault="undirected">
`;

  for (const n of nodes) {
    const id = escapeXml(n.id);
    const label = escapeXml(n.label || '');
    const type = escapeXml(n.type || '');
    const canonical = escapeXml(n.canonical || '');
    xml += `    <node id="${id}">
      <data key="d0">${label}</data>
      <data key="d1">${type}</data>
      <data key="d2">${canonical}</data>
    </node>\n`;
  }

  let edgeId = 0;
  for (const e of edges) {
    const source = escapeXml(e.source);
    const target = escapeXml(e.target);
    const weight = typeof e.weight === 'number' ? e.weight : 1.0;
    xml += `    <edge id="e${edgeId++}" source="${source}" target="${target}">
      <data key="d3">${weight}</data>
    </edge>\n`;
  }

  xml += `  </graph>
</graphml>`;

  return xml;
}

function escapeXml(unsafe: string | number): string {
  const str = String(unsafe);
  return str.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

export default exportSessionAsJson;
