import JSZip from 'jszip';

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

export function buildObsidianZip(data: { nodes: any[]; edges: any[]; emails?: any[] }): JSZip {
  const zip = new JSZip();
  const entityNames = new Map<string, string>();
  const documentNames = new Map<string, string>();
  const seenEntityNames = new Set<string>();
  const seenDocumentNames = new Set<string>();

  const nodes = data.nodes || [];
  const edges = data.edges || [];
  const emails = data.emails || [];

  for (const node of nodes) {
    entityNames.set(
      node.id,
      makeUniqueName(sanitizeFilename(node.label || node.displayName) || 'Unnamed_Entity', seenEntityNames)
    );
  }

  const documents = new Map<string, { id: string; name: string; mimeType: string; sizeBytes: number; uploadedAt: string | null }>();
  for (const node of nodes) {
    for (const occ of node.occurrences || []) {
      if (occ.fileId && !documents.has(occ.fileId)) {
        documents.set(occ.fileId, {
          id: occ.fileId,
          name: occ.fileName || 'Unnamed_Document',
          mimeType: occ.mimeType || 'application/octet-stream',
          sizeBytes: Number(occ.sizeBytes || 0),
          uploadedAt: occ.originalCreatedAt || null,
        });
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

  for (const node of nodes) {
    const entityName = entityNames.get(node.id)!;
    const relatedEdges = edges.filter((e) => e.source === node.id || e.target === node.id);

    let md = `---\nid: "${node.id}"\ntype: "${node.type}"\ncanonical: "${node.canonical || node.label}"\n---\n\n`;
    md += `# ${node.label || node.displayName}\n\n- **Type**: ${node.type}\n- **Canonical Name**: ${node.canonical || node.label}\n\n`;

    if (relatedEdges.length > 0) {
      md += `## Connections\n\n`;
      for (const edge of relatedEdges) {
        const neighborName = entityNames.get(edge.source === node.id ? edge.target : edge.source);
        const docName = documentNames.get(edge.fileId);
        if (neighborName && docName) {
          md += `- [[Entities/${neighborName}|${neighborName}]] (weight: ${edge.weight}) in [[Documents/${docName}|${edge.fileName || docName}]]\n`;
          if (edge.snippet) md += `  > ${edge.snippet}\n`;
        }
      }
      md += '\n';
    }

    if (node.occurrences && node.occurrences.length > 0) {
      md += `## Occurrences\n\n`;
      for (const occ of node.occurrences) {
        const docName = documentNames.get(occ.fileId);
        if (docName) {
          md += `- [[Documents/${docName}|${occ.fileName || docName}]] (count: ${occ.count})\n`;
          const formatted = formatExcerpts(occ.excerpts);
          if (formatted) md += `${formatted}\n`;
        }
      }
    }

    entitiesFolder?.file(`${entityName}.md`, md);
  }

  for (const doc of documents.values()) {
    const docName = documentNames.get(doc.id)!;
    const matchingEmail = emails.find((e) => e.fileId === doc.id);
    const docEntities = nodes.filter((n) => n.occurrences?.some((o: any) => o.fileId === doc.id));

    let md = `---\nid: "${doc.id}"\nmimeType: "${doc.mimeType}"\nsizeBytes: ${doc.sizeBytes}\n---\n\n`;
    md += `# ${doc.name}\n\n- **MIME Type**: ${doc.mimeType}\n- **Size**: ${(doc.sizeBytes / 1024).toFixed(2)} KB\n\n`;

    if (matchingEmail) {
      md += `## Email Headers\n\n`;
      md += `- **From**: ${matchingEmail.from}\n- **To**: ${matchingEmail.to}\n`;
      if (matchingEmail.cc) md += `- **CC**: ${matchingEmail.cc}\n`;
      if (matchingEmail.date) md += `- **Date**: ${matchingEmail.date}\n`;
      md += `- **Subject**: ${matchingEmail.subject}\n\n### Body\n\n`;
      md += `${matchingEmail.body.split('\n').map((l: string) => `> ${l}`).join('\n')}\n\n`;
    }

    if (docEntities.length > 0) {
      md += `## Extracted Entities\n\n`;
      for (const entity of docEntities) {
        const entityName = entityNames.get(entity.id);
        const occ = entity.occurrences.find((o: any) => o.fileId === doc.id);
        if (entityName && occ) md += `- [[Entities/${entityName}|${entity.label || entity.displayName}]] (count: ${occ.count})\n`;
      }
    }

    documentsFolder?.file(`${docName}.md`, md);
  }

  return zip;
}
