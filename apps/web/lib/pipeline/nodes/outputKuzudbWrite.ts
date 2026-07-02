import { NodeHandler } from '../executor';

export const handler: NodeHandler = {
  type: 'output.kuzudb_write',
  async run(inputs, config, context) {
    const input = inputs.input;
    if (!input || input.type !== 'graph') {
      throw new Error('Input is missing or is not of type "graph"');
    }

    const confirmCommit = config?.confirmCommit || false;
    if (!confirmCommit) {
      await context.log('[WARNING] Commit to KuzuDB aborted. Node configuration requires explicit "Confirm writing to live graph database" authorization.');
      return;
    }

    const { NLP_URL } = require('@/lib/nlp-url');
    await context.log('Sending graph payload for bulk import transaction in KuzuDB...');

    const fileIds = Array.from(
      new Set(
        input.nodes.flatMap((n) => (n.occurrences || []).map((o: any) => o.fileId)).filter(Boolean)
      )
    ) as string[];

    const nodes = input.nodes.map((n) => ({
      id: n.id,
      canonical: n.canonical || n.label || '',
      display_name: n.label || n.displayName || '',
      type: n.type,
      metadata: typeof n.metadata === 'string' ? n.metadata : JSON.stringify(n.metadata || {}),
      occurrences: (n.occurrences || []).map((o: any) => ({
        file_id: o.fileId,
        count: o.count || 1,
        excerpts: typeof o.excerpts === 'string' ? o.excerpts : JSON.stringify(o.excerpts || []),
      })),
    }));

    const edges = input.edges.map((e) => ({
      source: e.source,
      target: e.target,
      weight: e.weight || 1.0,
      distance: e.distance || 1,
      snippet: e.snippet || '',
      source_offset: e.sourceOffset || 0,
      target_offset: e.targetOffset || 0,
      file_id: e.fileId || 'pipeline-run',
    }));

    const res = await fetch(`${NLP_URL}/graph/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_ids: fileIds.length > 0 ? fileIds : ['pipeline-run'],
        nodes,
        edges,
      }),
    });

    if (!res.ok) {
      throw new Error(`KuzuDB Write failed: status ${res.status} | ${await res.text()}`);
    }

    const result = await res.json();
    await context.log(`KuzuDB Write Success: committed ${result.nodes_imported} nodes and ${result.edges_imported} edges.`);
  },
};
