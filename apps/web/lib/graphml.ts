const ENTITY_TYPES = new Set(['PERSON', 'ORGANIZATION', 'LOCATION', 'EMAIL', 'PHONE', 'IP_ADDRESS', 'URL', 'DATE', 'ADDRESS']);

type GraphLike = { nodes?: any[]; edges?: any[] };
type GraphMLData = { nodes: any[]; edges: any[] };
type ParseOptions = { fileName?: string; sourceFileId?: string; mimeType?: string };

const esc = (value: unknown) => String(value ?? '').replace(/[<>&'"]/g, (char) => ({
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
  '\'': '&apos;',
  '"': '&quot;',
}[char] || char));

const unesc = (value: string) => value
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&apos;/g, '\'')
  .replace(/&quot;/g, '"')
  .replace(/&amp;/g, '&');

function attrs(source: string): Record<string, string> {
  const out: Record<string, string> = {};
  source.replace(/([\w:.-]+)\s*=\s*(['"])(.*?)\2/g, (_, key, _quote, value) => {
    out[key] = unesc(value);
    return '';
  });
  return out;
}

function dataMap(body = '', keyNames = new Map<string, string>()) {
  const data: Record<string, string> = {};
  body.replace(/<data\b([^>]*)>([\s\S]*?)<\/data>/gi, (_, attrText, rawValue) => {
    const key = attrs(attrText).key || '';
    const name = keyNames.get(key) || key;
    if (name) data[name] = unesc(String(rawValue).replace(/<[^>]+>/g, '').trim());
    return '';
  });
  return data;
}

function graphmlKeys(xml: string) {
  const keys = new Map<string, string>();
  xml.replace(/<key\b([^>]*?)\/?>/gi, (_, attrText) => {
    const attr = attrs(attrText);
    if (attr.id) keys.set(attr.id, attr['attr.name'] || attr.name || attr.id);
    return '';
  });
  return keys;
}

function elements(xml: string, tag: 'node' | 'edge') {
  const out: Array<{ attr: Record<string, string>; body: string }> = [];
  const attrChunk = `((?:[^"'>]|"[^"]*"|'[^']*')*)`;
  xml.replace(new RegExp(`<${tag}\\b${attrChunk}(?<!/)>([\\s\\S]*?)<\\/${tag}>`, 'gi'), (_, attrText, body) => {
    out.push({ attr: attrs(attrText), body });
    return '';
  });
  xml.replace(new RegExp(`<${tag}\\b${attrChunk}\\/>`, 'gi'), (_, attrText) => {
    out.push({ attr: attrs(attrText), body: '' });
    return '';
  });
  return out;
}

const first = (data: Record<string, string>, keys: string[]) => keys.map((key) => data[key]).find(Boolean) || '';
const entityType = (value: string) => ENTITY_TYPES.has(value) ? value : 'ORGANIZATION';
const numberValue = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function parseGraphML(xml: string, options: ParseOptions = {}): GraphMLData {
  const fileName = options.fileName || 'graphml-import.graphml';
  const fileId = options.sourceFileId || `graphml:${fileName}`;
  const keyNames = graphmlKeys(xml);
  const nodes = elements(xml, 'node').map(({ attr, body }) => {
    const data = dataMap(body, keyNames);
    const label = first(data, ['label', 'name', 'displayName', 'Label']) || attr.label || attr.id || 'Unnamed node';
    const canonical = first(data, ['canonical', 'Canonical']) || label;
    const type = entityType(first(data, ['type', 'entityType', 'category', 'Type']).toUpperCase());
    const metadata = Object.fromEntries(Object.entries(data).filter(([key]) => !['label', 'name', 'displayName', 'Label', 'canonical', 'Canonical', 'type', 'entityType', 'category', 'Type'].includes(key)));
    return {
      id: attr.id || canonical,
      label,
      canonical,
      type,
      metadata: Object.keys(metadata).length ? metadata : null,
      occurrences: [{
        fileId,
        fileName,
        mimeType: options.mimeType || 'application/graphml+xml',
        count: numberValue(first(data, ['count', 'occurrenceCount', 'occurrences']), 1),
        excerpts: '[]',
      }],
    };
  });

  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = elements(xml, 'edge').flatMap(({ attr, body }) => {
    if (!attr.source || !attr.target || !nodeIds.has(attr.source) || !nodeIds.has(attr.target)) return [];
    const data = dataMap(body, keyNames);
    return [{
      source: attr.source,
      target: attr.target,
      weight: numberValue(first(data, ['weight', 'Weight']) || attr.weight, 1),
      distance: numberValue(first(data, ['distance', 'Distance']), 0),
      snippet: first(data, ['snippet', 'Snippet']) || '',
      sourceOffset: 0,
      targetOffset: 0,
      fileId,
      fileName,
    }];
  });

  return { nodes, edges };
}

export function buildGraphML(data: GraphLike): string {
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

  for (const node of nodes) {
    xml += `    <node id="${esc(node.id)}">
      <data key="d0">${esc(node.label || node.displayName || '')}</data>
      <data key="d1">${esc(node.type || '')}</data>
      <data key="d2">${esc(node.canonical || '')}</data>
    </node>\n`;
  }

  edges.forEach((edge, index) => {
    xml += `    <edge id="e${index}" source="${esc(edge.source)}" target="${esc(edge.target)}">
      <data key="d3">${typeof edge.weight === 'number' ? edge.weight : 1.0}</data>
    </edge>\n`;
  });

  return `${xml}  </graph>
</graphml>`;
}
