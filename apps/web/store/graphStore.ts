import { create } from "zustand";
import { GraphNode, GraphEdge } from "@/lib/graph-builder";
import { EntityType } from "@/types/entities";
import { GraphFilters } from "@/types/graph";

interface GraphStore {
  nodes: GraphNode[];
  edges: GraphEdge[];
  isLoading: boolean;
  selectedNodeId: string | null;
  layout: "cose-bilkent" | "circle" | "concentric" | "breadthfirst";
  filters: GraphFilters;
  isPanelOpen: boolean;
  refreshTrigger: number;
  layoutTrigger: number;

  setNodes: (nodes: GraphNode[]) => void;
  setEdges: (edges: GraphEdge[]) => void;
  setLoading: (val: boolean) => void;
  selectNode: (id: string | null) => void;
  setLayout: (l: GraphStore["layout"]) => void;
  setFilter: <K extends keyof GraphFilters>(key: K, val: GraphFilters[K]) => void;
  resetFilters: () => void;
  removeNode: (id: string | null) => void;
  clearGraph: () => void;
  togglePanel: (open: boolean) => void;
  triggerRefresh: () => void;
  triggerLayout: () => void;
}

const defaultFilters: GraphFilters = {
  entityTypes: [
    "PERSON",
    "ORGANIZATION",
    "LOCATION",
    "EMAIL",
    "ADDRESS",
  ] as EntityType[],
  fileIds: [],
  minConnections: 2,
  minOccurrences: 2,
  dateRange: { from: null, to: null },
  searchQuery: "",
  minEdgeWeight: 0.0,
  crossDocumentOnly: false,
  hiddenCommunities: [],
};

export const useGraphStore = create<GraphStore>((set) => ({
  nodes: [],
  edges: [],
  isLoading: false,
  selectedNodeId: null,
  layout: "cose-bilkent",
  filters: defaultFilters,
  isPanelOpen: false,
  refreshTrigger: 0,
  layoutTrigger: 0,

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setLoading: (val) => set({ isLoading: val }),
  selectNode: (id) => set({ selectedNodeId: id, isPanelOpen: id !== null }),
  setLayout: (l) => set({ layout: l }),
  setFilter: (key, val) =>
    set((s) => ({ filters: { ...s.filters, [key]: val } })),
  resetFilters: () => set({ filters: defaultFilters }),
  removeNode: (id) =>
    id
      ? set((s) => ({
          nodes: s.nodes.filter((n) => n.id !== id),
          edges: s.edges.filter((e) => e.source !== id && e.target !== id),
        }))
      : undefined,
  clearGraph: () =>
    set({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      isPanelOpen: false,
      filters: defaultFilters,
      refreshTrigger: 0,
      layoutTrigger: 0,
    }),
  togglePanel: (open) => set({ isPanelOpen: open }),
  triggerRefresh: () => set((s) => ({ refreshTrigger: s.refreshTrigger + 1 })),
  triggerLayout: () => set((s) => ({ layoutTrigger: s.layoutTrigger + 1 })),
}));
