export interface ExportFilterOptions {
  selectedTypes: Set<string>;
  keepAllNodes: boolean;
  limitNodes: number;
  minOccurrences: number;
  minTfidf: number;
  minConnections: number;
  minEdgeWeight: number;
  exportHiddenNodes: boolean;
}

export interface GraphExportData {
  hiddenNodeIds?: string[];
  nodes: any[];
  edges: any[];
  emails?: any[];
  [key: string]: any;
}

export function filterGraphExportData<T extends GraphExportData>(rawData: T, options: ExportFilterOptions): T {
  const { selectedTypes, keepAllNodes, limitNodes, minOccurrences, minTfidf, minConnections, minEdgeWeight, exportHiddenNodes } = options;
  const hidden = new Set<string>(rawData.hiddenNodeIds || []);
  
  const getSum = (node: any, tfidf: boolean) => (node.occurrences || []).reduce((s: number, o: any) => s + (tfidf ? (o.tfidf ?? o.count) : o.count), 0);

  let nodes = (rawData.nodes || []).filter((n: any) => 
    (exportHiddenNodes || !hidden.has(n.id)) && selectedTypes.has(n.type) && getSum(n, false) >= minOccurrences && getSum(n, true) >= minTfidf
  );

  let edges = (rawData.edges || []).filter((e: any) => e.weight >= minEdgeWeight);

  const conns = new Map<string, number>();
  for (const e of edges) {
    conns.set(e.source, (conns.get(e.source) || 0) + 1);
    conns.set(e.target, (conns.get(e.target) || 0) + 1);
  }

  nodes = nodes.filter((n: any) => (conns.get(n.id) || 0) >= minConnections);

  if (!keepAllNodes && limitNodes > 0) {
    nodes = nodes.sort((a: any, b: any) => getSum(b, true) - getSum(a, true)).slice(0, limitNodes);
  }

  const keptNodes = new Set(nodes.map((n: any) => n.id));
  edges = edges.filter((e: any) => keptNodes.has(e.source) && keptNodes.has(e.target));

  const keptFiles = new Set((nodes.flatMap((n: any) => n.occurrences || [])).map((o: any) => o.fileId));
  const emails = (rawData.emails || []).filter((em: any) => em.fileId && keptFiles.has(em.fileId));

  return { ...rawData, nodes, edges, emails };
}
