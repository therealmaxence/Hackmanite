# 2. Session Management & Data Portability

Hackmanite supports working on separate datasets or investigations simultaneously using **Sessions**. Each session has its own document list, graph database, extraction parameters, and layout settings.

[Back to Home Index](Home.md)

---

## Relational Metadata & Graph Databases

Under the hood, Hackmanite maintains a dual-database design to store session data efficiently:
1. **SQLite Database (`dev.db` / `production.db`)**: Stores metadata, session information, file names, status, file-entity mappings, occurrence excerpts, and structured email details.
2. **KuzuDB (Embedded Graph DB)**: An embedded, highly efficient graph database. It stores the actual entity nodes, category properties, and co-occurrence edges, allowing fast graph traversals and queries.

When you delete a session, both its SQLite metadata and its KuzuDB graph directory are completely removed.

---

## Working with Sessions

From the **Sessions** menu or the top header:
* **Create New Session**: Name your session (e.g., "Investigation Alpha") to initialize an empty database partition.
* **Switch Session**: Click on a session name from the list to load its active graph, uploaded files, and dashboards.
* **Delete Session**: Cleanly purge all documents and graph data associated with a session.

---

## Exporting and Importing Data

To share your work, back up analysis sessions, or integrate with external analytical tools, Hackmanite provides rich data portability formats.

### 1. JSON Snapshot (Full Backup)
* **What it is**: A proprietary JSON schema that wraps all SQLite relational metadata, file queues, entity details, occurrences, and co-occurrence snippets.
* **Use Case**: This is the best format for backing up your work or sending it to another Hackmanite user. Importing a JSON Snapshot fully restores the session environment.

### 2. GraphML Export & Import
* **What it is**: An industry-standard XML-based graph format.
* **Use Case**: Use this to load your entity networks into external graph analysis software such as **Gephi**, **Cytoscape Desktop**, or **Neo4j**.
* **GraphML Import**: If you import a standard GraphML file into Hackmanite, the app creates a new session. It automatically synthesizes files and occurrence properties if the source GraphML does not have Hackmanite-specific attributes.

### 3. Obsidian Vault Export (Markdown Knowledge Base)
* **What it is**: A zip folder containing a pre-formatted Obsidian markdown vault.
* **How to Use It**:
  1. Click **Export Obsidian** in the Graph page sidebar.
  2. Select prune settings (limiting top nodes or filtering by categories) and click **Export**.
  3. Extract the downloaded `session-<id>-obsidian.zip` archive.
  4. Open the **Obsidian** desktop app, click **Open folder as vault**, and select the extracted directory.
* **What's inside the vault**:
  * **Entity Notes**: Every entity gets its own markdown note (e.g. `John Doe.md`) detailing its category, global occurrences count, and links to every document it appears in.
  * **Document Notes**: Every uploaded document gets a note containing the extracted raw text, the list of extracted entities, and metadata.
  * **Obsidian Graph View**: Press `Ctrl + G` inside Obsidian to open Obsidian's native 2D/3D graph, mapping how documents and entities connect.
  * **Tags**: Entities are tagged by category (e.g. `#category/person`, `#category/organization`).
