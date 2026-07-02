import { NodeHandler } from '../executor';

export const handler: NodeHandler = {
  type: 'filter.entity_category',
  async run(inputs, config, context) {
    const input = inputs.input;
    if (!input || input.type !== 'graph') {
      throw new Error('Input is missing or is not of type "graph"');
    }

    const categoriesRaw = config?.categories;
    if (!categoriesRaw || typeof categoriesRaw !== 'string') {
      throw new Error('Missing parameter: categories');
    }

    const allowed = new Set(
      categoriesRaw
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
    );

    await context.log(`Filtering entities keeping only categories: ${Array.from(allowed).join(', ')}`);

    const filteredNodes = input.nodes.filter((n) => allowed.has(n.type?.toUpperCase()));
    const keptNodeIds = new Set(filteredNodes.map((n) => n.id));

    const filteredEdges = input.edges.filter(
      (e) => keptNodeIds.has(e.source) && keptNodeIds.has(e.target)
    );

    const filteredEmails = (input.emails || []).filter((e) =>
      filteredNodes.some((n) => n.occurrences?.some((occ: any) => occ.fileId === e.fileId))
    );

    await context.log(`Pruned graph: Kept ${filteredNodes.length}/${input.nodes.length} nodes, ${filteredEdges.length}/${input.edges.length} edges.`);

    return {
      type: 'graph',
      nodes: filteredNodes,
      edges: filteredEdges,
      emails: filteredEmails,
    };
  },
};
