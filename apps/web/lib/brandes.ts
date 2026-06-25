export function buildAdj(
  nodes: Set<string>,
  neighborhoods: { sourceEntityId: string; targetEntityId: string }[]
): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  for (const { sourceEntityId: s, targetEntityId: t } of neighborhoods) {
    if (s === t || !nodes.has(s) || !nodes.has(t)) continue;
    if (!adj.has(s)) adj.set(s, new Set());
    if (!adj.has(t)) adj.set(t, new Set());
    adj.get(s)!.add(t);
    adj.get(t)!.add(s);
  }
  return adj;
}

export function brandes(nodes: string[], adj: Map<string, Set<string>>): Map<string, number> {
  const centrality = new Map<string, number>(nodes.map((v) => [v, 0]));
  for (const s of nodes) {
    const S: string[] = [];
    const P = new Map<string, string[]>(nodes.map((w) => [w, []]));
    const sigma = new Map<string, number>(nodes.map((w) => [w, 0]));
    const d = new Map<string, number>(nodes.map((w) => [w, -1]));
    sigma.set(s, 1);
    d.set(s, 0);

    const Q: string[] = [s];
    while (Q.length) {
      const v = Q.shift()!;
      S.push(v);
      const dv = d.get(v)!;
      for (const w of (adj.get(v) ?? [])) {
        if (d.get(w)! < 0) {
          d.set(w, dv + 1);
          Q.push(w);
        }
        if (d.get(w)! === dv + 1) {
          sigma.set(w, sigma.get(w)! + sigma.get(v)!);
          P.get(w)!.push(v);
        }
      }
    }

    const delta = new Map<string, number>(nodes.map((w) => [w, 0]));
    while (S.length) {
      const w = S.pop()!;
      const coeff = (1 + delta.get(w)!) / sigma.get(w)!;
      for (const v of P.get(w)!) {
        delta.set(v, delta.get(v)! + sigma.get(v)! * coeff);
      }
      if (w !== s) {
        centrality.set(w, centrality.get(w)! + delta.get(w)!);
      }
    }
  }
  return centrality;
}
