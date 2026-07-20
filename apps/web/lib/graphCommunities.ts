export function computeGraphCommunities(
  nodes: { id: string }[],
  edges: { source: string; target: string; weight: number }[]
): Map<string, string> {
  const adj = new Map<string, Map<string, number>>(nodes.map(n => [n.id, new Map()]));
  for (const { source: s, target: t, weight: w } of edges) {
    if (adj.has(s) && adj.has(t)) {
      adj.get(s)!.set(t, w);
      adj.get(t)!.set(s, w);
    }
  }

  const labels = new Map<string, string>(nodes.map(n => [n.id, n.id]));
  for (let iter = 0; iter < 4; iter++) {
    for (const { id } of nodes) {
      const neighbors = adj.get(id);
      if (!neighbors || !neighbors.size) continue;
      const counts = new Map<string, number>();
      for (const [v, w] of neighbors) {
        const lbl = labels.get(v)!;
        counts.set(lbl, (counts.get(lbl) ?? 0) + w);
      }
      let [maxLbl, maxVal] = [labels.get(id)!, 0];
      for (const [lbl, val] of counts) {
        if (val > maxVal || (val === maxVal && lbl < maxLbl)) {
          maxVal = val;
          maxLbl = lbl;
        }
      }
      labels.set(id, maxLbl);
    }
  }

  for (const { id } of nodes) {
    const neighbors = adj.get(id);
    if (!neighbors || !neighbors.size) {
      labels.set(id, 'isolated');
    }
  }

  return labels;
}
