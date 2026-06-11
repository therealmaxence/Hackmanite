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

export function filterGraphExportData<T extends GraphExportData>(
  rawData: T,
  options: ExportFilterOptions
): T {
  const {
    selectedTypes,
    keepAllNodes,
    limitNodes,
    minOccurrences,
    minTfidf,
    minConnections,
    minEdgeWeight,
    exportHiddenNodes,
  } = options;

  const hiddenIdsSet = new Set<string>(rawData.hiddenNodeIds || []);
  
  // 1. Filter Nodes
  let filteredNodes = (rawData.nodes || []).filter((node: any) => {
    if (!exportHiddenNodes && hiddenIdsSet.has(node.id)) return false;
    if (!selectedTypes.has(node.type)) return false;
    const totalOccs = (node.occurrences || []).reduce((sum: number, o: any) => sum + o.count, 0);
    if (totalOccs < minOccurrences) return false;
    const totalTfidf = (node.occurrences || []).reduce((sum: number, o: any) => sum + (o.tfidf ?? o.count), 0);
    if (totalTfidf < minTfidf) return false;
    return true;
  });

  // 2. Filter Edges by Weight
  let filteredEdges = (rawData.edges || []).filter((edge: any) => edge.weight >= minEdgeWeight);

  // 3. Count Connections per Node based on filtered edges
  const connectionCounts = new Map<string, number>();
  for (const edge of filteredEdges) {
    connectionCounts.set(edge.source, (connectionCounts.get(edge.source) || 0) + 1);
    connectionCounts.set(edge.target, (connectionCounts.get(edge.target) || 0) + 1);
  }

  // 4. Filter Nodes by Connection Count
  filteredNodes = filteredNodes.filter((node: any) => {
    const conns = connectionCounts.get(node.id) || 0;
    return conns >= minConnections;
  });

  // 5. Limit Nodes by total TF-IDF if requested
  if (!keepAllNodes && limitNodes > 0) {
    filteredNodes.sort((a: any, b: any) => {
      const aVal = (a.occurrences || []).reduce((sum: number, o: any) => sum + (o.tfidf ?? o.count), 0);
      const bVal = (b.occurrences || []).reduce((sum: number, o: any) => sum + (o.tfidf ?? o.count), 0);
      return bVal - aVal;
    });
    filteredNodes = filteredNodes.slice(0, limitNodes);
  }

  // 6. Keep only edges between the final remaining nodes
  const keptNodeIds = new Set(filteredNodes.map((n: any) => n.id));
  filteredEdges = filteredEdges.filter((edge: any) => keptNodeIds.has(edge.source) && keptNodeIds.has(edge.target));

  // 7. Keep only emails associated with the files of the remaining nodes
  const keptFileIds = new Set<string>();
  for (const node of filteredNodes) {
    for (const occ of node.occurrences || []) {
      keptFileIds.add(occ.fileId);
    }
  }
  const filteredEmails = (rawData.emails || []).filter((email: any) => email.fileId && keptFileIds.has(email.fileId));

  return {
    ...rawData,
    nodes: filteredNodes,
    edges: filteredEdges,
    emails: filteredEmails,
  } as T;
}
