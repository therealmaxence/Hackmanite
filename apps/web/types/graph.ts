import { GraphNode, GraphEdge } from "@/lib/graph-builder";
import { EntityType } from "@/types/entities";

export interface GraphFilters {
  entityTypes: EntityType[];
  fileIds: string[];
  minConnections: number;
  minOccurrences: number;
  dateRange: { from: Date | null; to: Date | null };
  searchQuery: string;
  minEdgeWeight: number;
  crossDocumentOnly: boolean;
  hiddenCommunities: string[];
}

export interface GraphState {
  nodes: GraphNode[];
  edges: GraphEdge[];
  filteredNodeIds: Set<string>;
  isLoading: boolean;
  selectedNodeId: string | null;
  filters: GraphFilters;
  layout: "cose-bilkent" | "circle" | "concentric" | "breadthfirst";
}
