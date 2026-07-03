import { NodeHandler } from '../../executor';
import { NLP_URL } from '@/lib/nlp-url';
import { requireGraphInput } from '../shared';

export const kuzuDbWriteHandler: NodeHandler = {
  type: 'output.kuzudb_write',
  async run(inputs, config, context) {
    const input = requireGraphInput(inputs);
    const confirmCommit = config?.confirmCommit || false;
    if (!confirmCommit) {
      await context.log('[WARNING] Commit to KuzuDB aborted. Node configuration requires explicit "Confirm writing to live graph database" authorization.');
      return;
    }

    await context.log('Sending graph payload for bulk import transaction in KuzuDB...');
    const fileIds = Array.from(new Set(input.nodes.flatMap((node) => (node.occurrences || []).map((occ: any) => occ.fileId)).filter(Boolean))) as string[];
    const nodes = input.nodes.map((node: any) => ({
      id: node.id,
      canonical: node.canonical || node.label || '',
      display_name: node.label || node.displayName || '',
      type: node.type,
      metadata: typeof node.metadata === 'string' ? node.metadata : JSON.stringify(node.metadata || {}),
      occurrences: (node.occurrences || []).map((occ: any) => ({ file_id: occ.fileId, count: occ.count || 1, excerpts: typeof occ.excerpts === 'string' ? occ.excerpts : JSON.stringify(occ.excerpts || []) })),
    }));
    const edges = input.edges.map((edge: any) => ({
      source: edge.source,
      target: edge.target,
      weight: edge.weight || 1.0,
      distance: edge.distance || 1,
      snippet: edge.snippet || '',
      source_offset: edge.sourceOffset || 0,
      target_offset: edge.targetOffset || 0,
      file_id: edge.fileId || 'pipeline-run',
    }));

    const res = await fetch(`${NLP_URL}/graph/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_ids: fileIds.length > 0 ? fileIds : ['pipeline-run'], nodes, edges }),
    });

    if (!res.ok) throw new Error(`KuzuDB Write failed: status ${res.status} | ${await res.text()}`);
    const result = await res.json();
    await context.log(`KuzuDB Write Success: committed ${result.nodes_imported} nodes and ${result.edges_imported} edges.`);
  },
};
