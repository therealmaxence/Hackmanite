/**
 * Shared Label Propagation Algorithm (LPA) for Community Detection.
 * Groups nodes based on edge connections and weights using an O(iter * N * deg) undirected model.
 */
export function computeGraphCommunities(
  nodes: { id: string }[],
  edges: { source: string; target: string; weight: number }[]
): Map<string, string> {
  if (nodes.length === 0) return new Map<string, string>();

  const adj = new Map<string, Map<string, number>>();
  for (const n of nodes) {
    adj.set(n.id, new Map());
  }
  for (const e of edges) {
    if (adj.has(e.source) && adj.has(e.target)) {
      adj.get(e.source)!.set(e.target, e.weight);
      adj.get(e.target)!.set(e.source, e.weight);
    }
  }

  const labels = new Map<string, string>();
  for (const n of nodes) {
    labels.set(n.id, n.id);
  }

  const iterations = 4;
  for (let iter = 0; iter < iterations; iter++) {
    for (const n of nodes) {
      const u = n.id;
      const neighbors = adj.get(u);
      if (!neighbors || neighbors.size === 0) continue;

      const counts = new Map<string, number>();
      for (const [v, weight] of Array.from(neighbors.entries())) {
        const vLabel = labels.get(v)!;
        counts.set(vLabel, (counts.get(vLabel) ?? 0) + weight);
      }

      let maxLabel = labels.get(u)!;
      let maxVal = 0;
      for (const [label, val] of Array.from(counts.entries())) {
        if (val > maxVal) {
          maxVal = val;
          maxLabel = label;
        } else if (val === maxVal && label < maxLabel) {
          maxLabel = label;
        }
      }

      labels.set(u, maxLabel);
    }
  }

  return labels;
}
