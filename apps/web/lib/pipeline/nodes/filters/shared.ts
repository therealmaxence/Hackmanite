import { NodeHandler } from '../../executor';
import { requireGraphInput } from '../shared';

export function pruneGraphByNodes(input: any, filteredNodes: any[], context: any) {
  const keptNodeIds = new Set(filteredNodes.map((node) => node.id));
  const filteredEdges = input.edges.filter((edge: any) => keptNodeIds.has(edge.source) && keptNodeIds.has(edge.target));
  const keptFileIds = new Set(filteredNodes.flatMap((node) => (node.occurrences || []).map((occ: any) => occ.fileId)));
  const filteredEmails = (input.emails || []).filter((email: any) => keptFileIds.has(email.fileId));
  context.log(`Pruned graph: Kept ${filteredNodes.length}/${input.nodes.length} nodes, ${filteredEdges.length}/${input.edges.length} edges.`);
  return { type: 'graph' as const, nodes: filteredNodes, edges: filteredEdges, emails: filteredEmails };
}

export function computeDegreeMap(nodes: any[], edges: any[]): Map<string, number> {
  const degree = new Map<string, number>();
  for (const node of nodes) degree.set(node.id, 0);
  for (const edge of edges) {
    if (degree.has(edge.source)) degree.set(edge.source, degree.get(edge.source)! + 1);
    if (degree.has(edge.target)) degree.set(edge.target, degree.get(edge.target)! + 1);
  }
  return degree;
}

export function parseBetweenness(node: any): number {
  if (!node.metadata) return 0;
  try {
    const meta = typeof node.metadata === 'string' ? JSON.parse(node.metadata) : node.metadata;
    return meta.betweenness || meta.betweennessCentrality || 0;
  } catch {
    return 0;
  }
}

export function getOccurrenceCount(node: any): number {
  if (Array.isArray(node.occurrences)) return node.occurrences.reduce((sum: number, occ: any) => sum + (occ.count || 0), 0);
  return node.count || 0;
}

export function getTfidfValue(node: any): number {
  if (typeof node.tfidf === 'number') return node.tfidf;
  if (Array.isArray(node.occurrences)) return node.occurrences.reduce((sum: number, occ: any) => sum + (occ.tfidf || 0), 0);
  return 0;
}

export function getMetricValue(node: any, metric: string, degreeMap: Map<string, number>): number {
  const degree = degreeMap.get(node.id) || 0;
  switch (metric) {
    case 'degree': return degree;
    case 'betweenness': return parseBetweenness(node) || degree;
    case 'occurrence': return getOccurrenceCount(node);
    case 'tfidf':
    default:
      return (node.score ?? getTfidfValue(node)) || degree;
  }
}

export function buildThresholdFilterHandler(
  type: string,
  logPrefix: string,
  getNodeVal: (node: any, degreeMap: Map<string, number>) => number,
  defaultMin = 2,
  needsDegreeMap = false
): NodeHandler {
  return {
    type,
    async run(inputs, config, context) {
      const input = requireGraphInput(inputs);
      const min = Math.max(0, Number(config?.min) || defaultMin);
      const degreeMap = needsDegreeMap ? computeDegreeMap(input.nodes, input.edges) : new Map<string, number>();
      await context.log(`${logPrefix} >= ${min}`);
      return pruneGraphByNodes(input, input.nodes.filter((node: any) => getNodeVal(node, degreeMap) >= min), context);
    },
  };
}
