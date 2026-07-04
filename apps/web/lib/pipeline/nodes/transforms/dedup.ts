import { NodeHandler } from '../../executor';
import { requireGraphInput } from '../shared';
import { enrichNodeMetadata } from './shared';

function levenshtein(a: string, b: string): number {
  const tmp = [];
  for (let i = 0; i <= a.length; i++) tmp.push([i]);
  for (let j = 1; j <= b.length; j++) tmp[0].push(j);
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1,
        tmp[i][j - 1] + 1,
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return tmp[a.length][b.length];
}

function stringSimilarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  if (longer.length === 0) return 1.0;
  return (longer.length - levenshtein(longer.toLowerCase(), shorter.toLowerCase())) / longer.length;
}

export const entityResolverHandler: NodeHandler = {
  type: 'transform.entity_resolver',
  async run(inputs, config, context) {
    const input = requireGraphInput(inputs);
    const threshold = Number(config?.threshold ?? 0.85);
    await context.log(`Running Entity Resolution deduplication (threshold: ${threshold})...`);

    const sortedNodes = [...input.nodes].sort((a, b) => {
      const countA = (a.occurrences || []).reduce((sum: number, o: any) => sum + (o.count || 0), 0);
      const countB = (b.occurrences || []).reduce((sum: number, o: any) => sum + (o.count || 0), 0);
      return countB - countA;
    });

    const mergedTo = new Map<string, string>();
    const canonicalNodes: any[] = [];

    for (const node of sortedNodes) {
      if (mergedTo.has(node.id)) continue;

      let merged = false;
      const nodeLabel = node.label || node.displayName || '';

      for (const canonical of canonicalNodes) {
        if (canonical.type === node.type) {
          const canonicalLabel = canonical.label || canonical.displayName || '';
          if (stringSimilarity(nodeLabel, canonicalLabel) >= threshold) {
            mergedTo.set(node.id, canonical.id);
            canonical.occurrences = [...(canonical.occurrences || []), ...(node.occurrences || [])];
            
            const metaA = canonical.metadata ? (typeof canonical.metadata === 'string' ? JSON.parse(canonical.metadata) : canonical.metadata) : {};
            const metaB = node.metadata ? (typeof node.metadata === 'string' ? JSON.parse(node.metadata) : node.metadata) : {};
            canonical.metadata = JSON.stringify({ ...metaB, ...metaA });
            
            merged = true;
            break;
          }
        }
      }

      if (!merged) {
        canonicalNodes.push(node);
      }
    }

    const uniqueEdgesMap = new Map<string, any>();
    for (const edge of input.edges) {
      const source = mergedTo.get(edge.source) || edge.source;
      const target = mergedTo.get(edge.target) || edge.target;

      if (source === target) continue;

      const key = source < target ? `${source}->${target}` : `${target}->${source}`;
      const existing = uniqueEdgesMap.get(key);
      if (existing) {
        existing.weight = (existing.weight + (edge.weight || 1.0)) / 2;
        if (edge.snippet && !existing.snippet.includes(edge.snippet)) {
          existing.snippet += ` | ${edge.snippet}`;
        }
      } else {
        uniqueEdgesMap.set(key, { ...edge, source, target });
      }
    }

    const resolvedEdges = Array.from(uniqueEdgesMap.values());
    await context.log(`Resolved graph: merged ${input.nodes.length - canonicalNodes.length} duplicate entities. Remaining: ${canonicalNodes.length} nodes, ${resolvedEdges.length} edges.`);
    return { type: 'graph', nodes: canonicalNodes, edges: resolvedEdges, emails: input.emails || [] };
  },
};
