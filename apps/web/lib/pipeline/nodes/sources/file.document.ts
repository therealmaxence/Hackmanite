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

function mergeNodesAndEdges(allNodes: any[], allEdges: any[]) {
  const uniqueNodes: Record<string, any> = {};
  for (const node of allNodes) {
    if (uniqueNodes[node.id]) uniqueNodes[node.id].occurrences.push(...node.occurrences);
    else uniqueNodes[node.id] = { ...node };
  }

  const uniqueEdges: Record<string, any> = {};
  for (const edge of allEdges) {
    const key = `${edge.source}->${edge.target}`;
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

    let mimeType = config?.mimeType;
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

    const filesToProcess: Array<{ path: string; name: string; mime: string }> = [];
    if (lstatSync(absolutePath).isDirectory()) {
      await context.log(`Path ${diskPath} is a directory. Scanning for files...`);
      for (const fname of readdirSync(absolutePath)) {
        const fullPath = join(absolutePath, fname);
        if (lstatSync(fullPath).isDirectory()) continue;
        const dbFile = await prisma.file.findFirst({ where: { OR: [{ storagePath: join(diskPath, fname) }, { originalName: fname }] } });
        filesToProcess.push({ path: fullPath, name: fname, mime: dbFile?.mimeType || detectMimeType(fname) });
      }
    } else {
      filesToProcess.push({ path: absolutePath, name: filePath.split(/[/\\]/).pop() || '', mime: mimeType });
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
            file_id: `pipeline_${Date.now()}`,
            storage_path: fileToProc.path,
            mime_type: fileToProc.mime,
            window_size: windowSize,
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
            occurrences: [{ fileId: 'pipeline-run-doc', fileName: fileToProc.name, mimeType: fileToProc.mime, count: entity.count, excerpts: entity.excerpts ? JSON.stringify(entity.excerpts) : '[]' }],
          };
        }));

        allEdges.push(...(result.neighborhoods || []).map((nb: any) => ({
          source: uuid5(`${nb.source_type}:${nb.source_canonical.slice(0, 500)}`),
          target: uuid5(`${nb.target_type}:${nb.target_canonical.slice(0, 500)}`),
          weight: nb.weight,
          distance: nb.distance,
          snippet: nb.snippet,
          fileId: 'pipeline-run-doc',
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
