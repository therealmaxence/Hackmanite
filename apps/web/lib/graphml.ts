const ENTITY_TYPES = new Set(['PERSON', 'ORGANIZATION', 'LOCATION', 'EMAIL', 'PHONE', 'IP_ADDRESS', 'URL', 'DATE', 'ADDRESS']);
const MALTEGO_TYPES: Record<string, string> = {
  AS: 'ORGANIZATION',
  COMPANY: 'ORGANIZATION',
  ORGANIZATION: 'ORGANIZATION',
  PERSON: 'PERSON',
  DNSNAME: 'URL',
  DOMAIN: 'URL',
  URL: 'URL',
  WEBSITE: 'URL',
  IPV4ADDRESS: 'IP_ADDRESS',
  IPV6ADDRESS: 'IP_ADDRESS',
  IPADDRESS: 'IP_ADDRESS',
  NETBLOCK: 'IP_ADDRESS',
  EMAIL: 'EMAIL',
  EMAILADDRESS: 'EMAIL',
  PHONE: 'PHONE',
  PHONENUMBER: 'PHONE',
  LOCATION: 'LOCATION',
  GPSCOORDINATE: 'LOCATION',
  ADDRESS: 'ADDRESS',
  DATE: 'DATE',
};
const LABEL_KEYS = ['label', 'Label', 'name', 'Name', 'title', 'Title', 'displayName', 'Full Name', 'person.fullname', 'DNS Name', 'Domain Name', 'fqdn', 'URL', 'url', 'IP Address', 'ipv4-address', 'ipv6-address', 'Email Address', 'email.address', 'Phone Number', 'phone.number', 'AS Number', 'as.number', 'text', 'Text'];
const METADATA_SKIP = new Set(['label', 'name', 'displayName', 'title', 'Label', 'Name', 'canonical', 'Canonical', 'type', 'entityType', 'category', 'Type', 'MaltegoEntity', 'MaltegoLink']);

type GraphLike = { nodes?: any[]; edges?: any[] };
type GraphMLData = { nodes: any[]; edges: any[] };
type ParseOptions = { fileName?: string; sourceFileId?: string; mimeType?: string };
type XmlProperty = { name: string; displayName: string; type: string; hidden: boolean; value: string };

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
    if (name) data[name] = xmlText(rawValue);
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

function xmlText(value: string): string {
  return unesc(String(value).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

function elementText(body: string, names: string[]) {
  for (const name of names) {
    const match = body.match(new RegExp(`<(?:[\\w.-]+:)?${name}\\b[^>]*>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?${name}>`, 'i'));
    if (match?.[1]) return xmlText(match[1]);
  }
  return '';
}

function first(data: Record<string, string>, keys: string[]) {
  const wanted = new Set(keys.map((key) => key.toLowerCase()));
  return Object.entries(data).find(([key, value]) => wanted.has(key.toLowerCase()) && value)?.[1] || '';
}

function elementAttrs(body: string, name: string) {
  const match = body.match(new RegExp(`<(?:[\\w.-]+:)?${name}\\b([^>]*)>`, 'i'));
  return match?.[1] ? attrs(match[1]) : {};
}

function xmlProperties(body: string) {
  const out: XmlProperty[] = [];
  body.replace(/<(?:[\w.-]+:)?Property\b([^>]*)>([\s\S]*?)<\/(?:[\w.-]+:)?Property>/gi, (_, attrText, inner) => {
    const attr = attrs(attrText);
    const value = elementText(inner, ['Value']);
    if (value) out.push({ name: attr.name || '', displayName: attr.displayName || '', type: attr.type || '', hidden: attr.hidden === 'true', value });
    return '';
  });
  return out;
}

function propertyMap(properties: XmlProperty[]) {
  const data: Record<string, string> = {};
  properties.forEach((prop) => [prop.name, prop.displayName].forEach((key) => {
    if (key && !data[key]) data[key] = prop.value;
  }));
  return data;
}

function likelyLabel(data: Record<string, string>, body: string, fallbackId: string) {
  const explicit = first(data, LABEL_KEYS);
  if (explicit) return explicit;
  const nested = elementText(body, ['NodeLabel', 'Label', 'label', 'name', 'Title']);
  if (nested) return nested;
  return Object.values(data).find((value) => value && value !== fallbackId && !/^-?\d+(\.\d+)?$/.test(value)) || fallbackId || 'Unnamed node';
}

function maltegoInfo(body: string) {
  const attr = elementAttrs(body, 'MaltegoEntity');
  const properties = xmlProperties(body);
  const propertyData = propertyMap(properties);
  const label = first(propertyData, LABEL_KEYS) || properties.find((p) => !p.hidden && p.type !== 'boolean' && p.value.length < 300)?.value || '';
  return { label, type: attr.type || '', properties: propertyData };
}

function entityType(value: string) {
  const raw = value.trim();
  const upper = raw.toUpperCase();
  if (ENTITY_TYPES.has(upper)) return upper;
  return MALTEGO_TYPES[raw.replace(/^maltego\./i, '').replace(/[^a-z]/gi, '').toUpperCase()] || 'ORGANIZATION';
}

const numberValue = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const compact = (data: Record<string, unknown>) => Object.fromEntries(Object.entries(data).filter(([, value]) => value != null && value !== ''));
const clip = (value: string, max = 700) => value.length > max ? `${value.slice(0, max)}...` : value;

function nodeSnippet(label: string, type: string, data: Record<string, string>) {
  const details = Object.entries(data)
    .filter(([key, value]) => value && !METADATA_SKIP.has(key) && key !== value)
    .slice(0, 8)
    .map(([key, value]) => `${key}: ${clip(value, 180)}`)
    .join('; ');
  return [`Imported GraphML node: ${label}`, type && `Source type: ${type}`, details].filter(Boolean).join('\n');
}

export function parseGraphML(xml: string, options: ParseOptions = {}): GraphMLData {
  const fileName = options.fileName || 'graphml-import.graphml';
  const fileId = options.sourceFileId || `graphml:${fileName}`;
  const keyNames = graphmlKeys(xml);
  const nodes = elements(xml, 'node').map(({ attr, body }) => {
    const data = dataMap(body, keyNames);
    const maltego = maltegoInfo(body);
    const merged = { ...data, ...maltego.properties };
    const label = maltego.label || likelyLabel(merged, body, attr.label || attr.id || '');
    const canonical = first(merged, ['canonical', 'Canonical']) || label;
    const sourceType = first(merged, ['type', 'entityType', 'category', 'Type']) || maltego.type;
    const type = entityType(sourceType);
    const metadata = compact({
      ...Object.fromEntries(Object.entries(data).filter(([key]) => !METADATA_SKIP.has(key))),
      ...maltego.properties,
      graphmlId: attr.id,
      sourceType: sourceType || undefined,
    });
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
        count: numberValue(first(merged, ['count', 'occurrenceCount', 'occurrences']), 1),
        excerpts: JSON.stringify([{ text: nodeSnippet(label, sourceType, maltego.properties), offset: 0 }]),
      }],
    };
  });

  const nodeIds = new Set(nodes.map((node) => node.id));
  const nodeLabels = new Map(nodes.map((node) => [node.id, node.label || node.id]));
  const edges = elements(xml, 'edge').flatMap(({ attr, body }) => {
    if (!attr.source || !attr.target || !nodeIds.has(attr.source) || !nodeIds.has(attr.target)) return [];
    const data = { ...dataMap(body, keyNames), ...propertyMap(xmlProperties(body)) };
    const fallbackSnippet = `Imported GraphML edge ${nodeLabels.get(attr.source) || attr.source} -> ${nodeLabels.get(attr.target) || attr.target}`;
    return [{
      source: attr.source,
      target: attr.target,
      weight: numberValue(first(data, ['weight', 'Weight']) || attr.weight, 1),
      distance: numberValue(first(data, ['distance', 'Distance']), 0),
      snippet: first(data, ['snippet', 'Snippet', 'maltego.link.manual.type', 'maltego.link.label', 'Label', 'maltego.link.transform.display-name', 'Transform name', 'Description']) || fallbackSnippet,
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
