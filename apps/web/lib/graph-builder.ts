import { EntityType, ENTITY_COLORS } from "@/types/entities";


const LABEL_MAX_LEN = 20;

export interface GraphNode {
  id: string;
  label: string;
  type: EntityType | "FILE";
  fileCount: number;
  totalOccurrences: number;
  color: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
}

export interface CytoscapeNodeData {
  id: string;
  label: string;
  fullLabel: string;
  type: EntityType | "FILE";
  color: string;
  fileCount: number;
  totalOccurrences: number;
  bgImage?: string;
}

export interface CytoscapeEdgeData {
  id: string;
  source: string;
  target: string;
  weight: number;
}

export interface CytoscapeElement {
  data: CytoscapeNodeData | CytoscapeEdgeData;
  classes?: string;
}


export function buildCytoscapeElements(
  nodes: GraphNode[],
  edges: GraphEdge[]
): CytoscapeElement[] {
  const cyNodes: CytoscapeElement[] = nodes.map((n) => {
    const isFile = n.type === "FILE";
    let bgImage: string | undefined = undefined;

    if (isFile) {
      const parts = n.label.split('.');
      const ext = parts.length > 1 ? parts[parts.length - 1].toUpperCase() : 'FILE';
      const displayExt = ext.length > 4 ? ext.slice(0, 4) : ext;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="30"><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-family="DM Mono, monospace" font-size="10" font-weight="bold" fill="#0A0C10">${displayExt}</text></svg>`;
      bgImage = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    }

    return {
      data: {
        id: n.id,
        label: n.label.length > LABEL_MAX_LEN ? n.label.slice(0, LABEL_MAX_LEN - 2) + "…" : n.label,
        fullLabel: n.label,
        type: n.type,
        color: n.color || ENTITY_COLORS[n.type],
        fileCount: n.fileCount,
        totalOccurrences: n.totalOccurrences,
        ...(bgImage ? { bgImage } : {}),
      },
    };
  });

  const cyEdges: CytoscapeElement[] = edges.map((e, i) => ({
    data: {
      id: `edge-${i}|${e.source}|${e.target}`,
      source: e.source,
      target: e.target,
      weight: e.weight,
    },
  }));

  return [...cyNodes, ...cyEdges];
}

export const cytoscapeStylesheet = [
  {
    selector: "node",
    style: {
      "background-color": "data(color)",
      label: "data(label)",
      color: "#fff2f5",
      "font-family": "var(--font-mono, DM Mono, monospace)",
      "font-size": "11px",
      "text-valign": "bottom" as const,
      "text-margin-y": 6,
      "text-outline-color": "#120108",
      "text-outline-width": 2,
      width: "mapData(totalOccurrences, 1, 50, 22, 64)",
      height: "mapData(totalOccurrences, 1, 50, 22, 64)",
      "border-width": 2,
      "border-color": "data(color)",
      "border-opacity": 0.5,
      shape: "ellipse",
    },
  },
  {
    selector: 'node[type="FILE"]',
    style: {
      shape: "rectangle",
      "border-width": 3,
      "border-color": "var(--color-text)",
      "border-opacity": 0.8,
      width: 40,
      height: 30,
      "background-image": "data(bgImage)",
      "background-fit": "contain" as const,
      "background-clip": "node" as const,
    },
  },
  {
    selector: "node.hide-label",
    style: {
      label: "",
      "text-outline-width": 0,
    },
  },
  {
    selector: "node:selected",
    style: {
      "border-width": 3,
      "border-opacity": 1,
      "background-opacity": 0.9,
    },
  },
  {
    selector: "node.highlighted",
    style: {
      "border-width": 3,
      "border-opacity": 1,
      "opacity": 1,
    },
  },
  {
    selector: "node.faded",
    style: {
      opacity: 0.15,
    },
  },
  {
    selector: "edge",
    style: {
      width: "mapData(weight, 0, 1, 1, 5)",
      "line-color": "#3a0f25",
      opacity: 0.75,
      "curve-style": "haystack" as const,
    },
  },
  {
    selector: "edge:selected",
    style: {
      "line-color": "var(--color-primary)",
      opacity: 1,
    },
  },
  {
    selector: "edge.highlighted",
    style: {
      "line-color": "var(--color-primary)",
      opacity: 0.9,
    },
  },
  {
    selector: "edge.faded",
    style: {
      opacity: 0.05,
    },
  },
];

export const cytoscapeLayoutConfig = {
  name: "cose-bilkent",
  animate: true,
  animationDuration: 600,
  randomize: false,
  nodeDimensionsIncludeLabels: true,
  idealEdgeLength: 350,
  nodeRepulsion: 120000,
  gravity: 0.05,
  numIter: 2500,
  tile: true,
  tilingPaddingVertical: 25,
  tilingPaddingHorizontal: 25,
};
