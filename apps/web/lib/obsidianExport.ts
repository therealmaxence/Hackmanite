import JSZip from 'jszip';
import { SessionExportResponse } from '@/types/api';

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

function sanitizeFilename(name: string, maxLen = 100): string {
  const s = name.replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim();
  if (s.length <= maxLen) return s;
  const extIndex = s.lastIndexOf('.');
  if (extIndex > 0 && s.length - extIndex <= 10) {
    const ext = s.substring(extIndex);
    return s.substring(0, maxLen - ext.length).trim() + ext;
  }
  return s.substring(0, maxLen).trim();
}

function formatExcerpts(excerpts: any): string {
  if (!excerpts) return '';
  try {
    const parsed = typeof excerpts === 'string' ? JSON.parse(excerpts) : excerpts;
    return Array.isArray(parsed) ? parsed.map((e) => `> ${e}`).join('\n\n') : `> ${parsed}`;
  } catch {
    return `> ${excerpts}`;
  }
}

function makeUniqueName(baseName: string, seen: Set<string>): string {
  let name = baseName, counter = 1;
  while (seen.has(name.toLowerCase())) name = `${baseName}-${counter++}`;
  seen.add(name.toLowerCase());
  return name;
}

export async function exportSessionAsObsidian(sessionId: string): Promise<void> {
  const res = await fetch(`/api/session/${sessionId}/export`);
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Export failed');
  await generateAndDownloadObsidianZip(await res.json(), sessionId);
}

export async function generateAndDownloadObsidianZip(
  data: ExtendedSessionExportResponse,
  sessionId: string
): Promise<void> {
  const zip = new JSZip();
  const entityNames = new Map<string, string>();
  const documentNames = new Map<string, string>();
  const seenEntityNames = new Set<string>();
  const seenDocumentNames = new Set<string>();

  for (const node of data.nodes) {
    entityNames.set(node.id, makeUniqueName(sanitizeFilename(node.label) || 'Unnamed_Entity', seenEntityNames));
  }

  const documents = new Map<string, { id: string; name: string; mimeType: string; sizeBytes: number; uploadedAt: string | null }>();
  for (const node of data.nodes) {
    for (const occ of node.occurrences) {
      if (!documents.has(occ.fileId)) {
        documents.set(occ.fileId, { id: occ.fileId, name: occ.fileName, mimeType: occ.mimeType, sizeBytes: occ.sizeBytes, uploadedAt: occ.originalCreatedAt });
      }
    }
  }

  for (const doc of documents.values()) {
    const baseName = sanitizeFilename(doc.name) || 'Unnamed_Document';
    const extIndex = baseName.lastIndexOf('.');
    const base = extIndex > 0 ? baseName.substring(0, extIndex) : baseName;
    const ext = extIndex > 0 ? baseName.substring(extIndex) : '';
    let name = baseName, counter = 1;
    while (seenDocumentNames.has(name.toLowerCase())) name = `${base}-${counter++}${ext}`;
    seenDocumentNames.add(name.toLowerCase());
    documentNames.set(doc.id, name);
  }

  const entitiesFolder = zip.folder('Entities');
  const documentsFolder = zip.folder('Documents');

  for (const node of data.nodes) {
    const entityName = entityNames.get(node.id)!;
    const relatedEdges = data.edges.filter((e) => e.source === node.id || e.target === node.id);

    let md = `---\nid: "${node.id}"\ntype: "${node.type}"\ncanonical: "${node.canonical}"\n---\n\n`;
    md += `# ${node.label}\n\n- **Type**: ${node.type}\n- **Canonical Name**: ${node.canonical}\n\n`;

    if (relatedEdges.length > 0) {
      md += `## Connections\n\n`;
      for (const edge of relatedEdges) {
        const neighborName = entityNames.get(edge.source === node.id ? edge.target : edge.source);
        const docName = documentNames.get(edge.fileId);
        if (neighborName && docName) {
          md += `- [[Entities/${neighborName}|${neighborName}]] (weight: ${edge.weight}) in [[Documents/${docName}|${edge.fileName}]]\n`;
          if (edge.snippet) md += `  > ${edge.snippet}\n`;
        }
      }
      md += '\n';
    }

    if (node.occurrences.length > 0) {
      md += `## Occurrences\n\n`;
      for (const occ of node.occurrences) {
        const docName = documentNames.get(occ.fileId);
        if (docName) {
          md += `- [[Documents/${docName}|${occ.fileName}]] (count: ${occ.count})\n`;
          const formatted = formatExcerpts(occ.excerpts);
          if (formatted) md += `${formatted}\n`;
        }
      }
    }

    entitiesFolder?.file(`${entityName}.md`, md);
  }

  for (const doc of documents.values()) {
    const docName = documentNames.get(doc.id)!;
    const matchingEmail = data.emails?.find((e) => e.fileId === doc.id);
    const docEntities = data.nodes.filter((n) => n.occurrences.some((o) => o.fileId === doc.id));

    let md = `---\nid: "${doc.id}"\nmimeType: "${doc.mimeType}"\nsizeBytes: ${doc.sizeBytes}\n---\n\n`;
    md += `# ${doc.name}\n\n- **MIME Type**: ${doc.mimeType}\n- **Size**: ${(doc.sizeBytes / 1024).toFixed(2)} KB\n\n`;

    if (matchingEmail) {
      md += `## Email Headers\n\n`;
      md += `- **From**: ${matchingEmail.from}\n- **To**: ${matchingEmail.to}\n`;
      if (matchingEmail.cc) md += `- **CC**: ${matchingEmail.cc}\n`;
      if (matchingEmail.date) md += `- **Date**: ${matchingEmail.date}\n`;
      md += `- **Subject**: ${matchingEmail.subject}\n\n### Body\n\n`;
      md += `${matchingEmail.body.split('\n').map((l) => `> ${l}`).join('\n')}\n\n`;
    }

    if (docEntities.length > 0) {
      md += `## Extracted Entities\n\n`;
      for (const entity of docEntities) {
        const entityName = entityNames.get(entity.id);
        const occ = entity.occurrences.find((o) => o.fileId === doc.id);
        if (entityName && occ) md += `- [[Entities/${entityName}|${entity.label}]] (count: ${occ.count})\n`;
      }
    }

    documentsFolder?.file(`${docName}.md`, md);
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `session-${sessionId}-obsidian.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default exportSessionAsObsidian;
