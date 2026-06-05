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

type ExtendedSessionExportResponse = SessionExportResponse & {
  emails?: EmailData[];
};

function sanitizeFilename(name: string, maxLen = 100): string {
  const sanitized = name
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  if (sanitized.length <= maxLen) return sanitized;

  const extIndex = sanitized.lastIndexOf('.');
  if (extIndex > 0 && sanitized.length - extIndex <= 10) {
    const ext = sanitized.substring(extIndex);
    const base = sanitized.substring(0, extIndex);
    return base.substring(0, maxLen - ext.length).trim() + ext;
  }

  return sanitized.substring(0, maxLen).trim();
}

function formatExcerpts(excerpts: any): string {
  if (!excerpts) return '';
  try {
    const parsed = typeof excerpts === 'string' ? JSON.parse(excerpts) : excerpts;
    if (Array.isArray(parsed)) {
      return parsed.map(e => `> ${e}`).join('\n\n');
    }
    return `> ${parsed}`;
  } catch {
    return `> ${excerpts}`;
  }
}

export async function exportSessionAsObsidian(sessionId: string): Promise<void> {
  const res = await fetch(`/api/session/${sessionId}/export`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Export failed');
  }

  const data: ExtendedSessionExportResponse = await res.json();
  await generateAndDownloadObsidianZip(data, sessionId);
}

export async function generateAndDownloadObsidianZip(
  data: ExtendedSessionExportResponse,
  sessionId: string
): Promise<void> {
  const zip = new JSZip();

  const entityNames = new Map<string, string>();
  const documentNames = new Map<string, string>();

  const seenEntityNames = new Set<string>();
  for (const node of data.nodes) {
    const baseName = sanitizeFilename(node.label) || 'Unnamed_Entity';
    let name = baseName;
    let counter = 1;
    while (seenEntityNames.has(name.toLowerCase())) {
      name = `${baseName}-${counter}`;
      counter++;
    }
    seenEntityNames.add(name.toLowerCase());
    entityNames.set(node.id, name);
  }

  const seenDocumentNames = new Set<string>();
  const documents = new Map<string, { id: string; name: string; mimeType: string; sizeBytes: number; uploadedAt: string | null }>();

  for (const node of data.nodes) {
    for (const occ of node.occurrences) {
      if (!documents.has(occ.fileId)) {
        documents.set(occ.fileId, {
          id: occ.fileId,
          name: occ.fileName,
          mimeType: occ.mimeType,
          sizeBytes: occ.sizeBytes,
          uploadedAt: occ.originalCreatedAt,
        });
      }
    }
  }

  for (const doc of documents.values()) {
    const baseName = sanitizeFilename(doc.name) || 'Unnamed_Document';
    const extIndex = baseName.lastIndexOf('.');
    let base = baseName;
    let ext = '';
    if (extIndex > 0) {
      base = baseName.substring(0, extIndex);
      ext = baseName.substring(extIndex);
    }

    let name = baseName;
    let counter = 1;
    while (seenDocumentNames.has(name.toLowerCase())) {
      name = `${base}-${counter}${ext}`;
      counter++;
    }
    seenDocumentNames.add(name.toLowerCase());
    documentNames.set(doc.id, name);
  }

  const entitiesFolder = zip.folder('Entities');
  const documentsFolder = zip.folder('Documents');

  for (const node of data.nodes) {
    const entityName = entityNames.get(node.id)!;
    const relatedEdges = data.edges.filter(e => e.source === node.id || e.target === node.id);

    let md = `---\nid: "${node.id}"\ntype: "${node.type}"\ncanonical: "${node.canonical}"\n---\n\n`;
    md += `# ${node.label}\n\n`;
    md += `- **Type**: ${node.type}\n`;
    md += `- **Canonical Name**: ${node.canonical}\n\n`;

    if (relatedEdges.length > 0) {
      md += `## Connections\n\n`;
      for (const edge of relatedEdges) {
        const neighborId = edge.source === node.id ? edge.target : edge.source;
        const neighborName = entityNames.get(neighborId);
        const docName = documentNames.get(edge.fileId);

        if (neighborName && docName) {
          md += `- [[Entities/${neighborName}|${neighborName}]] (weight: ${edge.weight}) in [[Documents/${docName}|${edge.fileName}]]\n`;
          if (edge.snippet) {
            md += `  > ${edge.snippet}\n`;
          }
        }
      }
      md += `\n`;
    }

    if (node.occurrences.length > 0) {
      md += `## Occurrences\n\n`;
      for (const occ of node.occurrences) {
        const docName = documentNames.get(occ.fileId);
        if (docName) {
          md += `- [[Documents/${docName}|${occ.fileName}]] (count: ${occ.count})\n`;
          if (occ.excerpts) {
            const formatted = formatExcerpts(occ.excerpts);
            if (formatted) {
              md += `${formatted}\n`;
            }
          }
        }
      }
    }

    entitiesFolder?.file(`${entityName}.md`, md);
  }

  for (const doc of documents.values()) {
    const docName = documentNames.get(doc.id)!;
    const docEntities = data.nodes.filter(n => n.occurrences.some(o => o.fileId === doc.id));
    const matchingEmail = data.emails?.find(e => e.fileId === doc.id);

    let md = `---\nid: "${doc.id}"\nmimeType: "${doc.mimeType}"\nsizeBytes: ${doc.sizeBytes}\n---\n\n`;
    md += `# ${doc.name}\n\n`;
    md += `- **MIME Type**: ${doc.mimeType}\n`;
    md += `- **Size**: ${(doc.sizeBytes / 1024).toFixed(2)} KB\n\n`;

    if (matchingEmail) {
      md += `## Email Headers\n\n`;
      md += `- **From**: ${matchingEmail.from}\n`;
      md += `- **To**: ${matchingEmail.to}\n`;
      if (matchingEmail.cc) {
        md += `- **CC**: ${matchingEmail.cc}\n`;
      }
      if (matchingEmail.date) {
        md += `- **Date**: ${matchingEmail.date}\n`;
      }
      md += `- **Subject**: ${matchingEmail.subject}\n\n`;

      md += `### Body\n\n`;
      md += `${matchingEmail.body.split('\n').map(l => `> ${l}`).join('\n')}\n\n`;
    }

    if (docEntities.length > 0) {
      md += `## Extracted Entities\n\n`;
      for (const entity of docEntities) {
        const entityName = entityNames.get(entity.id);
        const occ = entity.occurrences.find(o => o.fileId === doc.id);
        if (entityName && occ) {
          md += `- [[Entities/${entityName}|${entity.label}]] (count: ${occ.count})\n`;
        }
      }
    }

    documentsFolder?.file(`${docName}.md`, md);
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `session-${sessionId}-obsidian.zip`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default exportSessionAsObsidian;
