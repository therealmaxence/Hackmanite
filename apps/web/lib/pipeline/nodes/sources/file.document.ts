import { NodeHandler } from '../../executor';
import { prisma } from '@/lib/prisma';
import { NLP_URL } from '@/lib/nlp-url';
import { uuid5 } from '@/lib/uuid5';
import { existsSync, lstatSync, readdirSync } from 'fs';
import { join, resolve } from 'path';

function detectMimeType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (ext === 'txt') return 'text/plain';
  if (ext === 'json') return 'application/json';
  if (ext === 'eml') return 'message/rfc822';
  return 'text/plain';
}

async function resolveDbFile(filePath: string) {
  return prisma.file.findFirst({ where: { OR: [{ storagePath: filePath }, { originalName: filePath }, { id: filePath }] } });
}

async function resolveSessionFiles(filePath: string) {
  const sessionId = filePath.replace(/\\/g, '/').split('/').filter(Boolean).pop();
  if (!sessionId) return [];
  return prisma.file.findMany({
    where: { sessionId },
    select: { id: true, originalName: true, storagePath: true, mimeType: true },
  });
}

async function resolveFilesByIds(fileIds: string[]) {
  if (!fileIds.length) return [];
  return prisma.file.findMany({
    where: { id: { in: fileIds } },
    select: { id: true, originalName: true, storagePath: true, mimeType: true },
  });
}

function mergeNodesAndEdges(allNodes: any[], allEdges: any[]) {
  const uniqueNodes: Record<string, any> = {};
  for (const node of allNodes) {
    if (uniqueNodes[node.id]) uniqueNodes[node.id].occurrences.push(...node.occurrences);
    else uniqueNodes[node.id] = { ...node };
  }

  const uniqueEdges: Record<string, any> = {};
  for (const edge of allEdges) {
    const key = `${edge.fileId || ''}:${edge.source}->${edge.target}`;
    if (uniqueEdges[key]) uniqueEdges[key].weight = (uniqueEdges[key].weight + edge.weight) / 2;
    else uniqueEdges[key] = { ...edge };
  }

  return { nodes: Object.values(uniqueNodes), edges: Object.values(uniqueEdges) };
}

export const documentSourceHandler: NodeHandler = {
  type: 'source.file.document',
  async run(_, config, context) {
    const filePath = config?.filePath;
    if (!filePath) throw new Error('Missing parameter: filePath');
    const windowSize = Math.max(1, parseInt(config?.windowSize ?? config?.window_size ?? 400, 10) || 400);

    const filesToProcess: Array<{ id: string; path: string; name: string; mime: string }> = [];

    let mimeType = config?.mimeType;
    const configuredFileIds = Array.isArray(config?.fileIds) ? config.fileIds.filter(Boolean).map(String) : [];
    const sessionFiles = configuredFileIds.length > 0 ? await resolveFilesByIds(configuredFileIds) : await resolveSessionFiles(filePath);
    if (sessionFiles.length > 0) {
      await context.log(`Resolved ${sessionFiles.length} uploaded files for document source.`);
      for (const file of sessionFiles) {
        const absoluteStoragePath = resolve(process.cwd(), file.storagePath);
        if (!existsSync(absoluteStoragePath)) {
          await context.log(`Warning: Uploaded file is missing on disk: ${file.originalName}`);
          continue;
        }
        filesToProcess.push({ id: file.id, path: absoluteStoragePath, name: file.originalName, mime: file.mimeType || detectMimeType(file.originalName) });
      }
    } else {
      if (!mimeType) {
        const dbFile = await resolveDbFile(filePath);
        mimeType = dbFile?.mimeType || detectMimeType(filePath);
      }

      let diskPath = filePath;
      if (!existsSync(resolve(process.cwd(), diskPath))) {
        const dbFile = await resolveDbFile(filePath);
        if (dbFile) diskPath = dbFile.storagePath;
      }

      const absolutePath = resolve(process.cwd(), diskPath);
      if (!existsSync(absolutePath)) throw new Error(`Path does not exist: ${filePath}`);

      if (lstatSync(absolutePath).isDirectory()) {
        await context.log(`Path ${diskPath} is a directory. Scanning for files...`);
        for (const fname of readdirSync(absolutePath)) {
          const fullPath = join(absolutePath, fname);
          if (lstatSync(fullPath).isDirectory()) continue;
          const dbFile = await prisma.file.findFirst({ where: { OR: [{ storagePath: join(diskPath, fname) }, { originalName: fname }] } });
          filesToProcess.push({ id: dbFile?.id || `pipeline-${fname}`, path: fullPath, name: fname, mime: dbFile?.mimeType || detectMimeType(fname) });
        }
      } else {
        const dbFile = await resolveDbFile(filePath);
        filesToProcess.push({ id: dbFile?.id || 'pipeline-run-doc', path: absolutePath, name: filePath.split(/[/\\]/).pop() || '', mime: mimeType });
      }
    }

    if (filesToProcess.length === 0) throw new Error(`No files found to process in: ${filePath}`);

    const allNodes: any[] = [];
    const allEdges: any[] = [];

    for (const fileToProc of filesToProcess) {
      await context.log(`Processing file: ${fileToProc.name} (${fileToProc.mime})`);
      try {
        const res = await fetch(`${NLP_URL}/extract`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file_id: fileToProc.id,
            storage_path: fileToProc.path,
            mime_type: fileToProc.mime,
            window_size: windowSize,
            persist: false,
          }),
        });
        if (!res.ok) {
          await context.log(`Warning: Failed to extract from file ${fileToProc.name}: ${res.statusText}`);
          continue;
        }
        const result = await res.json();
        if (result.error) {
          await context.log(`Warning: NLP service error for file ${fileToProc.name}: ${result.error}`);
          continue;
        }

        allNodes.push(...(result.entities || []).map((entity: any) => {
          const canonical = entity.canonical.slice(0, 500);
          return {
            id: uuid5(`${entity.type}:${canonical}`),
            label: entity.display_name,
            type: entity.type,
            canonical,
            metadata: entity.metadata ? JSON.stringify(entity.metadata) : '{}',
            occurrences: [{ fileId: fileToProc.id, fileName: fileToProc.name, mimeType: fileToProc.mime, count: entity.count, excerpts: entity.excerpts ? JSON.stringify(entity.excerpts) : '[]' }],
          };
        }));

        allEdges.push(...(result.neighborhoods || []).map((nb: any) => ({
          source: uuid5(`${nb.source_type}:${nb.source_canonical.slice(0, 500)}`),
          target: uuid5(`${nb.target_type}:${nb.target_canonical.slice(0, 500)}`),
          weight: nb.weight,
          distance: nb.distance,
          snippet: nb.snippet,
          fileId: fileToProc.id,
          fileName: fileToProc.name,
        })));
      } catch (err: any) {
        await context.log(`Warning: Failed to process file ${fileToProc.name}: ${err.message || err}`);
      }
    }

    const merged = mergeNodesAndEdges(allNodes, allEdges);
    await context.log(`NLP Extraction finished: extracted ${merged.nodes.length} nodes, ${merged.edges.length} edges across ${filesToProcess.length} files.`);
    return { type: 'graph', nodes: merged.nodes, edges: merged.edges };
  },
};
