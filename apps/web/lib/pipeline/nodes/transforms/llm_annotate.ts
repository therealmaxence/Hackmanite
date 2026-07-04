import { GraphData, NodeHandler } from '../../executor';
import { executeLlmRequest } from '@/lib/api/llm-client';
import { requireGraphInput } from '../shared';

function parseMetadata(metadata: any) {
  if (!metadata) return {};
  if (typeof metadata !== 'string') return metadata;
  try { return JSON.parse(metadata); } catch { return {}; }
}

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const start = text.indexOf('{');
  if (start === -1) throw new Error('LLM response did not contain a valid JSON object');
  const raw = fenced || text.slice(start, text.lastIndexOf('}') + 1);
  return JSON.parse(raw);
}

function compactGraph(input: GraphData, maxNodes: number) {
  const nodes = input.nodes.slice(0, maxNodes).map((node: any) => ({
    id: node.id,
    label: node.label || node.displayName,
    type: node.type,
    canonical: node.canonical,
    tfidf: node.tfidf,
    metadata: parseMetadata(node.metadata),
  }));
  const nodeIds = new Set(nodes.map((node) => node.id));
  return {
    nodes,
    edges: input.edges
      .filter((edge: any) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
      .slice(0, maxNodes * 3)
      .map((edge: any) => ({ source: edge.source, target: edge.target, weight: edge.weight, snippet: edge.snippet })),
  };
}

function mergeNodeUpdates(input: GraphData, updates: any[]) {
  const byId = new Map(updates.filter((update) => update?.id).map((update) => [update.id, update]));
  return input.nodes.map((node: any) => {
    const update = byId.get(node.id);
    if (!update) return node;
    const { id: _id, metadata, annotation, llmAnnotation, ...rest } = update;
    const nextMetadata = { ...parseMetadata(node.metadata), ...parseMetadata(metadata) };
    const note = llmAnnotation ?? annotation;
    if (note !== undefined) nextMetadata.llmAnnotation = note;
    return { ...node, ...rest, metadata: JSON.stringify(nextMetadata) };
  });
}

export const llmAnnotateHandler: NodeHandler = {
  type: 'transform.llm_annotate',
  async run(inputs, config, context) {
    const input = requireGraphInput(inputs);
    const prompt = String(config?.prompt || '').trim();
    if (!prompt) throw new Error('Missing parameter: prompt');

    const provider = config?.provider || 'mistral';
    const endpoint = config?.endpoint || (provider === 'mistral' ? 'https://api.mistral.ai/v1' : 'http://localhost:11434/v1');
    const model = config?.model || (provider === 'mistral' ? 'mistral-large-latest' : 'llama3');
    const maxNodes = Math.max(1, Number(config?.maxNodes) || 80);
    const graph = compactGraph(input, maxNodes);

    await context.log(`Sending ${graph.nodes.length} nodes to LLM transform "${model}".`);
    const text = await executeLlmRequest({
      provider,
      endpoint,
      apiKey: provider === 'mistral' ? process.env.MISTRAL_API_KEY : undefined,
      model,
      temperature: Number(config?.temperature ?? 0.2),
      systemPrompt: 'You transform entity graph data. Return only valid JSON. Use nodeUpdates for annotations, or set replaceGraph true with nodes and edges to replace the graph.',
      userPrompt: JSON.stringify({
        instruction: prompt,
        responseSchema: {
          nodeUpdates: [{ id: 'existing-node-id', metadata: { key: 'value' }, annotation: 'optional note' }],
          replaceGraph: false,
          nodes: 'optional full replacement node array when replaceGraph is true',
          edges: 'optional full replacement edge array when replaceGraph is true',
        },
        graph,
      }),
    });

    const parsed = extractJson(text);
    if (parsed?.replaceGraph === true && Array.isArray(parsed.nodes)) {
      await context.log(`LLM returned replacement graph with ${parsed.nodes.length} nodes.`);
      return { type: 'graph' as const, nodes: parsed.nodes, edges: Array.isArray(parsed.edges) ? parsed.edges : [], emails: input.emails || [] };
    }

    const updates = Array.isArray(parsed?.nodeUpdates) ? parsed.nodeUpdates : Array.isArray(parsed?.nodes) ? parsed.nodes : [];
    const nodes = mergeNodeUpdates(input, updates);
    await context.log(`LLM annotations merged for ${updates.length} node updates.`);
    return { type: 'graph' as const, nodes, edges: input.edges, emails: input.emails || [] };
  },
};
