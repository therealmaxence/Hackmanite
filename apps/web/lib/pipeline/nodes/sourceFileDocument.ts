import { NodeHandler } from '../executor';

export const handler: NodeHandler = {
  type: 'source.file.document',
  async run(_, config, context) {
    const filePath = config?.filePath;
    if (!filePath) {
      throw new Error('Missing parameter: filePath');
    }

    const { prisma } = require('@/lib/prisma');
    const { resolve } = require('path');
    const { uuid5 } = require('@/lib/uuid5');

    let mimeType = config?.mimeType;
    if (!mimeType) {
      const dbFile = await prisma.file.findFirst({
        where: {
          OR: [
            { storagePath: filePath },
            { originalName: filePath }
          ]
        }
      });
      if (dbFile) {
        mimeType = dbFile.mimeType;
      } else {
        const ext = filePath.split('.').pop()?.toLowerCase();
        if (ext === 'pdf') mimeType = 'application/pdf';
        else if (ext === 'docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        else if (ext === 'txt') mimeType = 'text/plain';
        else if (ext === 'json') mimeType = 'application/json';
        else if (ext === 'eml') mimeType = 'message/rfc822';
        else mimeType = 'text/plain';
      }
    }

    const { existsSync } = require('fs');
    let diskPath = filePath;
    if (!existsSync(resolve(process.cwd(), diskPath))) {
      const dbFile = await prisma.file.findFirst({
        where: {
          OR: [
            { storagePath: filePath },
            { originalName: filePath },
            { id: filePath }
          ]
        }
      });
      if (dbFile) {
        diskPath = dbFile.storagePath;
      }
    }

    const absolutePath = resolve(process.cwd(), diskPath);
    await context.log(`Invoking NLP service extraction for document file: ${diskPath}`);

    const { NLP_URL } = require('@/lib/nlp-url');
    const res = await fetch(`${NLP_URL}/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_id: `pipeline_${Date.now()}`,
        storage_path: absolutePath,
        mime_type: mimeType,
        window_size: 400,
      }),
    });

    if (!res.ok) {
      throw new Error(`NLP service failed with status ${res.status}: ${await res.text()}`);
    }

    const result = await res.json();
    if (result.error) {
      throw new Error(result.error);
    }

    const nodes = (result.entities || []).map((e: any) => {
      const canonical = e.canonical.slice(0, 500);
      const stableId = uuid5(`${e.type}:${canonical}`);
      return {
        id: stableId,
        label: e.display_name,
        type: e.type,
        canonical,
        metadata: e.metadata ? JSON.stringify(e.metadata) : '{}',
        occurrences: [
          {
            fileId: 'pipeline-run-doc',
            fileName: filePath,
            mimeType,
            count: e.count,
            excerpts: e.excerpts ? JSON.stringify(e.excerpts) : '[]',
          },
        ],
      };
    });

    const edges = (result.neighborhoods || []).map((nb: any) => {
      const sourceId = uuid5(`${nb.source_type}:${nb.source_canonical.slice(0, 500)}`);
      const targetId = uuid5(`${nb.target_type}:${nb.target_canonical.slice(0, 500)}`);
      return {
        source: sourceId,
        target: targetId,
        weight: nb.weight,
        distance: nb.distance,
        snippet: nb.snippet,
        fileId: 'pipeline-run-doc',
        fileName: filePath,
      };
    });

    await context.log(`NLP Extraction finished: extracted ${nodes.length} nodes, ${edges.length} edges.`);

    return {
      type: 'graph',
      nodes,
      edges,
    };
  },
};
