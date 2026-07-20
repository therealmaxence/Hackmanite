import { create } from "zustand";
import { GraphNode, GraphEdge } from "@/lib/graph-builder";
import { EntityType } from "@/types/entities";
import { GraphFilters } from "@/types/graph";

interface GraphStore {
  nodes: GraphNode[];
  edges: GraphEdge[];
  isLoading: boolean;
  selectedNodeId: string | null;
  selectedNodeIds: string[];
  layout: "cose-bilkent" | "circle" | "concentric" | "breadthfirst";
  filters: GraphFilters;
  isPanelOpen: boolean;
  refreshTrigger: number;
  layoutTrigger: number;
  cooccurrenceNodeIds: string[];
  isCooccurrenceModalOpen: boolean;
  activeView: 'graph' | 'table';

  setNodes: (nodes: GraphNode[]) => void;
  setEdges: (edges: GraphEdge[]) => void;
  setLoading: (val: boolean) => void;
  selectNode: (id: string | null) => void;
  setSelectedNodeIds: (ids: string[]) => void;
  setLayout: (l: GraphStore["layout"]) => void;
  setFilter: <K extends keyof GraphFilters>(key: K, val: GraphFilters[K]) => void;
  resetFilters: () => void;
  removeNode: (id: string | null) => void;
  changeNodeType: (oldId: string, newId: string, newType: EntityType, newColor: string) => void;
  clearGraph: () => void;
  togglePanel: (open: boolean) => void;
  triggerRefresh: () => void;
  triggerLayout: () => void;
  addCooccurrenceNodeId: (id: string) => void;
  removeCooccurrenceNodeId: (id: string) => void;
  clearCooccurrenceNodeIds: () => void;
  setCooccurrenceModalOpen: (open: boolean) => void;
  setActiveView: (view: 'graph' | 'table') => void;
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
  minTfidf: 0.0,
  dateRange: { from: null, to: null },
  searchQuery: "",
  minEdgeWeight: 0.0,
  crossDocumentOnly: false,
  hiddenCommunities: [],
  showWeakSignals: false,
};

export const useGraphStore = create<GraphStore>((set) => ({
  nodes: [],
  edges: [],
  isLoading: false,
  selectedNodeId: null,
  selectedNodeIds: [],
  layout: "cose-bilkent",
  filters: defaultFilters,
  isPanelOpen: false,
  refreshTrigger: 0,
  layoutTrigger: 0,
  cooccurrenceNodeIds: [],
  isCooccurrenceModalOpen: false,
  activeView: 'graph',

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setLoading: (val) => set({ isLoading: val }),
  selectNode: (id) => set({ selectedNodeId: id, selectedNodeIds: id ? [id] : [], isPanelOpen: id !== null }),
  setSelectedNodeIds: (ids) => set({ selectedNodeIds: ids, selectedNodeId: ids.length === 1 ? ids[0] : null, isPanelOpen: ids.length > 0 }),
  setLayout: (l) => set({ layout: l }),
  setFilter: (key, val) =>
    set((s) => ({ filters: { ...s.filters, [key]: val } })),
  resetFilters: () => set({ filters: defaultFilters }),
  removeNode: (id) =>
    id
      ? set((s) => ({
          nodes: s.nodes.filter((n) => n.id !== id),
          edges: s.edges.filter((e) => e.source !== id && e.target !== id),
          selectedNodeIds: s.selectedNodeIds.filter((x) => x !== id),
          cooccurrenceNodeIds: s.cooccurrenceNodeIds.filter((x) => x !== id),
        }))
      : undefined,
  changeNodeType: (oldId, newId, newType, newColor) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === oldId ? { ...n, id: newId, type: newType, color: newColor } : n
      ),
      edges: s.edges.map((e) => ({
        ...e,
        source: e.source === oldId ? newId : e.source,
        target: e.target === oldId ? newId : e.target,
      })),
      selectedNodeId: s.selectedNodeId === oldId ? newId : s.selectedNodeId,
      selectedNodeIds: s.selectedNodeIds.map((x) => (x === oldId ? newId : x)),
      cooccurrenceNodeIds: s.cooccurrenceNodeIds.map((x) => (x === oldId ? newId : x)),
    })),
  clearGraph: () =>
    set({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      selectedNodeIds: [],
      isPanelOpen: false,
      filters: defaultFilters,
      refreshTrigger: 0,
      layoutTrigger: 0,
      cooccurrenceNodeIds: [],
      isCooccurrenceModalOpen: false,
      activeView: 'graph',
    }),
  togglePanel: (open) => set({ isPanelOpen: open }),
  triggerRefresh: () => set((s) => ({ refreshTrigger: s.refreshTrigger + 1 })),
  triggerLayout: () => set((s) => ({ layoutTrigger: s.layoutTrigger + 1 })),
  addCooccurrenceNodeId: (id) =>
    set((s) => ({
      cooccurrenceNodeIds: s.cooccurrenceNodeIds.includes(id)
        ? s.cooccurrenceNodeIds
        : [...s.cooccurrenceNodeIds, id],
    })),
  removeCooccurrenceNodeId: (id) =>
    set((s) => ({
      cooccurrenceNodeIds: s.cooccurrenceNodeIds.filter((x) => x !== id),
    })),
  clearCooccurrenceNodeIds: () => set({ cooccurrenceNodeIds: [] }),
  setCooccurrenceModalOpen: (open) => set({ isCooccurrenceModalOpen: open }),
  setActiveView: (view) => set({ activeView: view }),
}));
