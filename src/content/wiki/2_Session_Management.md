# 2. Session Management & Data Portability

Hackmanite supports working on separate datasets or investigations simultaneously using **Sessions**. Each session has its own document list, graph database, extraction parameters, and layout settings.

---

## Relational Metadata & Graph Databases

Under the hood, Hackmanite maintains a dual-database design to store session data efficiently:
1. **SQLite Database (`dev.db` / `production.db`)**: Stores metadata, session information, file names, status, file-entity mappings, occurrence excerpts, and structured email details.
2. **KuzuDB (Embedded Graph DB)**: An embedded, highly efficient graph database. It stores the actual entity nodes, category properties, and co-occurrence edges, allowing fast graph traversals and queries.

When you delete a session, both its SQLite metadata and its KuzuDB graph directory are completely removed.

---

## Exporting and Importing Data

### 1. JSON Snapshot (Full Backup)
A proprietary JSON schema that wraps all SQLite relational metadata, file queues, entity details, occurrences, and co-occurrence snippets for full session restoration.

### 2. GraphML Export & Import
Industry-standard XML graph format for loading entity networks into external tools such as **Gephi**, **Cytoscape Desktop**, or **Neo4j**.

### 3. Obsidian Vault Export (Markdown Knowledge Base)
Generates a zip folder containing a pre-formatted Obsidian markdown vault:
* **Entity Notes**: Markdown note for every entity detailing category, total occurrences, and links to all documents it appears in.
* **Document Notes**: Raw text, extracted entity lists, and metadata for each uploaded file.
* **Obsidian Graph View**: Open Obsidian and press `Ctrl + G` to view 2D/3D graph connections.
