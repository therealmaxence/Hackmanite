# 3. Interactive Graph Explorer

The **Graph Explorer** page provides a visual representation of your document collection as a network. Relationships are shown as connections between entities, helping you discover central actors, clusters, and hidden connections.

[Back to Home Index](Home.md)

---

## Layout and Visual Design

Hackmanite uses **Cytoscape.js** to render clean, interactive networks. To prevent visual clutter:
* **Node Styling**: Nodes are color-coded and shaped by their entity category (e.g., Persons are blue circles, Organizations are purple rectangles, Locations are green diamonds, etc.).
* **Edge Weights**: Edges represent co-occurrences. Thicker lines indicate that two entities appear close together frequently across your files.
* **Weak Signal Highlights**: Emerging signals or broker nodes are highlighted with a dashed border and a pulsing neon purple glow.

---

## Network Controls and Filter Sliders

The collapsible left sidebar provides sliders to prune the graph and focus on the most relevant information:

1. **TF-IDF Relevance Slider**:
   * Term Frequency-Inverse Document Frequency measures how specific an entity is to particular files. 
   * Slide this right to filter out generic terms (like common dates or email headers) and focus on specific topics.
2. **Min Occurrences**:
   * Filters out entities that appear fewer times than the threshold across your corpus.
3. **Min Connections (Degree)**:
   * Filters out isolated nodes. If set to `3`, only nodes connected to at least 3 other nodes will remain visible.
4. **Min Edge Weight**:
   * Hides weak connections. Increase this to only show pairs of entities that co-occur very frequently.
5. **Hide/Show Nodes**:
   * You can right-click any node on the canvas and choose "Hide Node". You can review and restore hidden nodes from the list at the bottom of the sidebar.

---

## Progressive Node Loading

Rendering tens of thousands of nodes at once can crash your browser or make the interface unresponsive. Hackmanite implements a **progressive loader** at the bottom of the screen:

* **Progress Bar**: Shows how many nodes are currently loaded on the canvas (e.g., `500 / 12,000`).
* **Manual Input**: Click the loaded node count (underlined dashed text) to type in a precise target node limit.
* **Load More**: Click **Load More** to fetch the next batch of nodes. The loader prioritizes nodes with higher centrality.
* **Expand on Double-Click**: Double-clicking a node fetches all of its immediate neighbors from the database, even if they aren't currently loaded, allowing you to expand your network organically.

---

## Canvas Actions and Mouse Controls

Navigate the network using these controls:
* **Pan**: Click and drag on the empty canvas.
* **Zoom**: Use your mouse scroll wheel, or pinch on a trackpad.
* **Move Node**: Click and drag a single node to reposition it.
* **Select Node**: Click a node to open its details panel on the right, listing its occurrences, statistics, and text snippets.
* **Co-occurrence Selection**: Hold `Ctrl` (or `Cmd` on Mac) and click on two or more nodes to perform a multi-node analysis.
