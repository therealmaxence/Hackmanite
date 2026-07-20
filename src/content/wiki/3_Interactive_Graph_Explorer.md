# 3. Interactive Graph Explorer

The **Graph Explorer** page provides a visual representation of your document collection as a network. Relationships are shown as connections between entities, helping you discover central actors, clusters, and hidden connections.

---

## Layout and Visual Design

Hackmanite uses **Cytoscape.js** to render clean, interactive networks:
* **Node Styling**: Color-coded and shaped by category (Person: Blue, Organization: Purple, Location: Green, Email: Orange, Date: Slate).
* **Edge Weights**: Lines represent co-occurrences. Thicker lines indicate frequent co-occurrences.
* **Weak Signal Highlights**: Emerging signals or broker nodes are highlighted with dashed borders and a pulsing neon purple glow.

---

## Network Controls and Filter Sliders

The collapsible left sidebar provides sliders to prune the graph:
1. **TF-IDF Relevance Slider**: Slide right to filter out generic terms and focus on specific topics.
2. **Min Occurrences**: Filters out entities appearing fewer times than the threshold.
3. **Min Connections (Degree)**: Filters isolated nodes.
4. **Min Edge Weight**: Hides weak co-occurrence links.
5. **Hide/Show Nodes**: Right-click any node to hide or restore it.

---

## Progressive Node Loading

To avoid rendering bottlenecks on massive graphs:
* **Progress Bar**: Shows currently loaded node count (e.g. `500 / 12,000`).
* **Load More**: Click **Load More** to fetch the next batch of nodes sorted by centrality.
* **Expand on Double-Click**: Double-clicking a node fetches all immediate neighbors from the database.
