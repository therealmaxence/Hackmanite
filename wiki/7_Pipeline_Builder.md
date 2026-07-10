# 7. Pipeline Builder

The **Pipeline Builder** is a visual editor that allows you to compose reusable graph-processing workflows. You can load files, apply custom mathematical and AI filters, preview the output, and export files or save results back to the database.

[Back to Home Index](Home.md)

---

## The Canvas Interface

* **Palette (Left Sidebar)**: Contains all available nodes grouped by category. Click a node in the palette to place it onto the canvas.
* **Canvas (Center)**: Drag nodes to position them. Hover over a node and click the small **"i"** button to read a summary of what it does.
* **Connections**: Drag from the right-side connector (output port) of a node to the left-side connector (input port) of another node to draw a curved arrow.
* **Configuration (Right Sidebar)**: Click any node on the canvas to view and edit its parameters (e.g., slider values, text queries, or file selections).

---

## Node Categories

### 1. Sources (Start of Pipeline)
* **Active Session Graph**: Loads the current session's network.
* **Document File / Email File**: Reads specific uploaded files. You can configure the `windowSize` (sentence/paragraph extraction distance) here.
* **SQLite / KuzuDB Query**: Run custom SQL or Cypher read-only queries to fetch specific data.

### 2. Filters (Pruning Data)
* **Entity Category**: Only pass through specific types (e.g. `PERSON` or `GPE`).
* **Top N Nodes**: Restricts the graph to the top N most connected nodes.
* **Min TF-IDF / Occurrences / Connections**: Standard statistical pruning.
* **Edge Weight**: Prunes connections below a specific co-occurrence strength.
* **Denylist**: Excludes specific entity names from the network.

### 3. Transforms (Analyzing & Annotating)
* **Weak Signal Transforms**: Compute Rare Bridges, Niche Topics, or Spiking Signals dynamically.
* **Community Detection / Centrality**: Label nodes with community groups or centrality scores.
* **LLM Annotate**: Sends a bounded graph context to an OpenAI-compatible LLM endpoint (such as Ollama or Mistral) and merges the returned metadata or annotations back into the node properties.

### 4. Visualizers (Previews)
* **Graph Preview / Table Preview**: Displays interactive previews of the current pipeline state directly in the log panel.

### 5. Outputs (Ending Nodes)
* **JSON / GraphML / Obsidian Export**: Generates download links for files.
* **AI Report**: Generates an analytical report of the filtered graph.
* **Commit to KuzuDB**: Writes the pipeline's generated graph back into the active database. *Requires explicit user confirmation before executing.*

---

## Running and Monitoring Workflows

1. **Save First**: Click the **Save** button. Hackmanite will prompt you to save the pipeline before execution.
2. **Execute**: Click the **Run** button.
3. **Inspect Progress**:
   * Running nodes will **glow** on the canvas.
   * Open the **Logs** tab to view terminal output, step completion times, and error messages.
4. **Deactivating Nodes**:
   * Right-click a node and select **Deactivate**.
   * Deactivated nodes remain on the canvas but are bypassed during execution, allowing you to test different branches of your workflow.
