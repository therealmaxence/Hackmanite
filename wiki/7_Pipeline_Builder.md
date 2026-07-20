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
* **Active Session Graph**: Loads the current active session's entity network directly from the database.
* **Document File**: Reads and extracts entities from specific documents (.pdf, .docx, .txt, etc.). Includes configurable extraction window size settings.
* **Email File**: Extracts communications and entity networks from email archives (.eml, .pst).
* **CSV File**: Loads entity nodes and connection edges directly from a formatted CSV file.
* **GraphML File**: Loads an existing graph representation in standard GraphML format.
* **Web Scraper**: Scrapes public web pages from URLs to ingest fresh text content and extract entities.
* **SQLite Query**: Runs a custom SQL read-only query on the relational database.
* **KuzuDB Query**: Runs a custom Cypher query on the graph database.

### 2. Filters (Pruning Data)
* **Entity Category**: Filters nodes to only pass through selected entity types (e.g., Person, Organization, Location).
* **Allow/Deny List**: Explicitly allows or excludes nodes by their entity name or display label.
* **Top N Nodes**: Restricts the graph to the top N most connected nodes based on centrality.
* **Min TF-IDF**: Prunes entities whose statistical TF-IDF salience falls below the threshold.
* **Min Occurrences**: Filters out entities that do not meet a minimum occurrence count across the dataset.
* **Min Connections**: Filters out nodes with fewer than the specified number of unique connections (degree centrality).
* **Edge Weight**: Removes links/connections below a specified co-occurrence strength threshold.
* **Weak Signal**: Passes through only nodes that have been flagged as a Rare Bridge, Niche Topic, or Spiking Signal.
* **Date Range**: Restricts processing to documents or emails matching a specific timeframe.

### 3. Transforms (Analyzing & Annotating)
* **Rare Bridges**: Computes structural brokering scores to identify nodes linking isolated communities.
* **Niche Topics**: Identifies highly localized, salient topics present in at most two documents.
* **Spiking Signals**: Detects emerging burst activity in sliding windows along the chronological timeline.
* **Community Detection**: Groups nodes into clusters based on link density (e.g., using Louvain or label propagation algorithms).
* **Centrality Score**: Computes topological metrics like Degree and Betweenness centrality for every node.
* **Entity Resolution**: Deduplicates and merges node entries that refer to the same real-world entity.
* **LLM Annotate**: Dispatches bounded graph context to an OpenAI-compatible LLM endpoint (Mistral, Ollama, etc.) to append custom AI metadata, tags, or summaries back to nodes.

### 4. Visualizers (Previews)
* **Graph Preview**: Renders an interactive 2D network preview of the current pipeline state directly in the log panel.
* **Table Preview**: Lists the active nodes, categories, and metrics in a tabular layout for inspection.
* **Timeline Preview**: Generates a chronological timeline view mapping occurrences over the session history.

### 5. Outputs (Ending Nodes)
* **JSON Export**: Generates a downloadable JSON file containing the processed nodes and edges.
* **CSV Export**: Exports the node list and edge list into structured CSV files.
* **GraphML Export**: Generates a standard GraphML file compatible with external network tools like Gephi.
* **Obsidian Export**: Bundles the processed results into a zip vault of linked markdown pages.
* **AI Report**: Runs an LLM analytical summary over the pipeline data to write a markdown report.
* **HTML Dashboard**: Packages the graph, tables, and statistics into a standalone, interactive HTML dashboard file.
* **Commit to KuzuDB**: Writes the processed nodes, edges, and occurrence snippets back into the active database. *Requires explicit user confirmation before executing.*

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
