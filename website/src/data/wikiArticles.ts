export interface WikiArticle {
  id: string;
  num: number;
  title: string;
  category: 'Guide' | 'Analysis' | 'Workflows' | 'Architecture';
  summary: string;
  content: string;
}

export const WIKI_ARTICLES: WikiArticle[] = [
  {
    id: 'getting-started',
    num: 1,
    title: 'Getting Started with Hackmanite',
    category: 'Guide',
    summary: 'Installation methods, first-time setup, the Ingestion Dropzone, supported document formats, and OCR configuration.',
    content: `# 1. Getting Started with Hackmanite

Hackmanite (EntityGraph Explorer) is designed to run locally on your system, processing files and keeping all data fully private. This guide covers how to launch the application, ingest files, and set up Optical Character Recognition (OCR) for scanned documents.

---

## Running the Application

Depending on how you received Hackmanite, you can launch it in one of the following ways:

### 1. Portable ZIP (Recommended for Users)
* Use **7-Zip** to extract the \`Hackmanite-1.0.0-win.zip\` package (Windows' built-in extractor can silently corrupt files in large ZIP archives).
* Double-click **\`Hackmanite.exe\`** in the extracted directory. All required services (FastAPI NLP service, Next.js web server, and SQLite database) will boot automatically.

### 2. Docker Mode (Development)
* With Docker Desktop running, execute the following command at the repository root:
  \`\`\`powershell
  docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
  \`\`\`
* Open your browser and navigate to \`http://localhost:3000\`.

### 3. Launching from the GitHub Repository
If you cloned the source code from GitHub:
* Running the app in local development mode (booting Next.js, the FastAPI service, and the Electron wrapper manually) requires installing Node.js and Python dependencies.
* Refer to the main repository README for complete first-time installation and dev-run instructions.

### 4. Compiling and Building the Desktop App
If you wish to compile the application binaries yourself or build a new portable ZIP:
* You will need to compile the Next.js frontend, package the Python NLP service with PyInstaller, and bundle everything with electron-builder.

---

## Document Ingestion Dropzone

When you launch Hackmanite, you will land on the **Home Dashboard**. 

### 1. Uploading Files
To begin extracting entities, simply drag and drop your files or folders onto the central **Dropzone** area, or click the dropzone to browse your system files.

* **Supported Formats**: 
  * Documents: PDF, Word (\`.docx\`), PowerPoint (\`.pptx\`), Excel (\`.xlsx\`), Text (\`.txt\`, \`.rtf\`, \`.md\`), HTML (\`.html\`).
  * Emails: Email formats (\`.eml\`, \`.pst\`).
  * Images: \`.png\`, \`.jpg\`, \`.jpeg\`, \`.tiff\`, \`.bmp\`.

### 2. The Extraction Queue
Once files are dropped, they are added to the queue in the right-hand panel:
* **Asynchronous Processing**: Files are processed in the background one by one. You will see status indicators: \`Processing\`, \`Success\`, or \`Failed\`.
* **Progress Tracking**: The top bar displays the total files, files completed, and any errors encountered.
* **Explore Graph**: Once at least one file is successfully processed, the **Explore Graph** button will activate, allowing you to view your network.

---

## Optical Character Recognition (OCR)

To extract entities from scanned documents, image-based PDFs, or standalone images, Hackmanite uses **Tesseract OCR**.

> **Note on OCR**: To enable OCR, install Tesseract OCR on your machine. Without it, image files will not yield any text content, and scanned PDFs will appear blank.

### Installing Tesseract OCR:
* **Windows**: Run \`winget install UB-Mannheim.TesseractOCR\` in PowerShell (Admin).
* **macOS**: Run \`brew install tesseract\`.
* **Linux**: Run \`sudo apt install tesseract-ocr\`.

### Auto-Detection:
Hackmanite automatically detects Tesseract if installed at its standard system location.
`
  },
  {
    id: 'session-management',
    num: 2,
    title: 'Session Management & Data Portability',
    category: 'Guide',
    summary: 'Creating and switching sessions, dual database storage (SQLite + KuzuDB), and exporting/importing snapshots (JSON, GraphML, Obsidian Vault).',
    content: `# 2. Session Management & Data Portability

Hackmanite supports working on separate datasets or investigations simultaneously using **Sessions**. Each session has its own document list, graph database, extraction parameters, and layout settings.

---

## Relational Metadata & Graph Databases

Under the hood, Hackmanite maintains a dual-database design to store session data efficiently:
1. **SQLite Database (\`dev.db\` / \`production.db\`)**: Stores metadata, session information, file names, status, file-entity mappings, occurrence excerpts, and structured email details.
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

### 1. JSON Snapshot (Full Backup)
* **What it is**: A proprietary JSON schema that wraps all SQLite relational metadata, file queues, entity details, occurrences, and co-occurrence snippets.
* **Use Case**: Best format for backing up work or transferring to another Hackmanite instance.

### 2. GraphML Export & Import
* **What it is**: An industry-standard XML-based graph format.
* **Use Case**: Export network data into **Gephi**, **Cytoscape Desktop**, or **Neo4j**.

### 3. Obsidian Vault Export (Markdown Knowledge Base)
* **What it is**: A zip folder containing a pre-formatted Obsidian markdown vault.
* **Vault Contents**:
  * **Entity Notes**: Markdown note for each entity detailing category, total occurrences, and document links.
  * **Document Notes**: Raw text, extracted entity lists, and metadata for each uploaded file.
  * **Obsidian Graph View**: Press \`Ctrl + G\` inside Obsidian to open Obsidian's 2D/3D graph.
`
  },
  {
    id: 'graph-explorer',
    num: 3,
    title: 'Interactive Graph Explorer',
    category: 'Analysis',
    summary: 'Interactive Cytoscape.js network canvas, layout customization, progressive loading, filter sliders, and node legends.',
    content: `# 3. Interactive Graph Explorer

The **Graph Explorer** page provides a visual representation of your document collection as a network. Relationships are shown as connections between entities, helping you discover central actors, clusters, and hidden connections.

---

## Layout and Visual Design

Hackmanite uses **Cytoscape.js** to render clean, interactive networks:
* **Node Styling**: Nodes are color-coded and shaped by entity category (Person: Blue circle, Organization: Purple rectangle, Location: Green diamond, Email: Orange hex, etc.).
* **Edge Weights**: Edges represent co-occurrences. Thicker lines indicate frequent co-occurrences.
* **Weak Signal Highlights**: Emerging signals or broker nodes are highlighted with dashed borders and a pulsing neon purple glow.

---

## Network Controls and Filter Sliders

The collapsible left sidebar provides sliders to prune the graph:
1. **TF-IDF Relevance Slider**: Slide right to filter out generic terms and focus on specific topics.
2. **Min Occurrences**: Filters out entities appearing fewer times than the threshold.
3. **Min Connections (Degree)**: Filters isolated nodes (e.g. min degree = 3).
4. **Min Edge Weight**: Hides weak co-occurrence links.
5. **Hide/Show Nodes**: Right-click any node to hide or restore it.

---

## Progressive Node Loading

To avoid rendering bottlenecks on massive graphs:
* **Progress Bar**: Shows currently loaded node count (e.g. \`500 / 12,000\`).
* **Load More**: Click **Load More** to fetch the next batch of nodes sorted by centrality.
* **Expand on Double-Click**: Double-clicking a node fetches all immediate neighbors from the database.
`
  },
  {
    id: 'co-occurrence',
    num: 4,
    title: 'Co-occurrence Analysis',
    category: 'Analysis',
    summary: 'Multi-node selection, overlapping file lists, matching text snippets, and contextual entity highlighting.',
    content: `# 4. Co-occurrence Analysis

Understanding **why** and **how** two or more entities are related is the core of intelligence analysis. Hackmanite provides a dedicated **Co-occurrence Panel** to display direct textual evidence connecting your nodes.

---

## How Co-occurrence is Computed

When a document is ingested, Hackmanite splits text into sliding contextual windows (sentences or paragraphs):
* If two entities appear in the same window, a **co-occurrence** edge is registered.
* Link weight decays based on token distance.
* The physical sentence snippet containing both entities is stored in the database.

---

## Analyzing Connections Step-by-Step

1. **Select Nodes**: Hold \`Ctrl\` (or \`Cmd\` on Mac) and click target entities on the canvas.
2. **Review Side Panel**: The **Co-occurrence Panel** slides open automatically.
3. **Compare Tabs**:
   * **File Co-occurrence**: Lists all common source documents.
   * **Text Co-occurrence**: Lists exact paragraphs where entities co-occur with highlighted text.
`
  },
  {
    id: 'emails',
    num: 5,
    title: 'Emails Dashboard',
    category: 'Analysis',
    summary: 'Browsing email archives (.eml, .pst), header filtering (From, To, Date), and locating source attachments.',
    content: `# 5. Emails Dashboard

Hackmanite contains specialized parsers and UI views for email archives (.eml and .pst).

---

## Ingesting Email Files

* **EML Files (\`.eml\`)**: Individual email messages.
* **PST Files (\`.pst\`)**: Outlook personal folders containing multiple email messages.

---

## Dedicated Email Interface

* **Header Table**: Displays Sender (From), Recipients (To/CC/BCC), Subject, Date, and Attachment counts.
* **Search & Filters**: Multi-parameter search across subject, body, or domain names.
* **Email Details Panel**: Clicking any row opens the body viewer with extracted entities highlighted inline.
`
  },
  {
    id: 'weak-signals',
    num: 6,
    title: 'Weak Signals Discovery Engine',
    category: 'Analysis',
    summary: 'Mathematical indicators: Rare Bridges (betweenness centrality), Niche Topics (local TF-IDF), and Spiking Signals (temporal bursts).',
    content: `# 6. Weak Signals Discovery

In intelligence analysis, high-density hubs are not always the most critical nodes. Hackmanite computes three mathematical **Weak Signals** to highlight hidden indicators.

---

## 1. Rare Bridges (Structural Brokers)

Nodes with low overall frequency that act as critical topological connectors between isolated sub-networks.

$$\\text{Score} = \\frac{\\text{Betweenness Centrality}}{\\text{Total Occurrences} + 1}$$

---

## 2. Niche Topics (Localized Relevance)

Entities highly specific to a small subset of documents (max 2 files) with high local TF-IDF salience.

$$\\text{Score} = \\max(\\text{TF-IDF in local occurrences})$$

---

## 3. Spiking Signals (Temporal Bursts)

Entities experiencing a sudden burst of frequency in a short chronological timeframe.

$$\\text{Score} = \\text{Peak Window TF-IDF} \\times \\text{Concentration Ratio}$$

* Analyzed using a sliding window of **20%** of session timeline.
* Requires at least **60%** of occurrences within the peak window.
`
  },
  {
    id: 'pipeline-builder',
    num: 7,
    title: 'Pipeline Builder',
    category: 'Workflows',
    summary: 'Visual DAG canvas editor for graph workflows: node editor palette, canvas connections, execution logs, and export nodes.',
    content: `# 7. Pipeline Builder

The **Pipeline Builder** is a visual editor for composing reusable graph processing workflows.

---

## Node Categories

1. **Sources**: Active Session Graph, Document File, Email File, CSV, GraphML, Web Scraper, SQLite Query, KuzuDB Query.
2. **Filters**: Entity Category, Allow/Deny List, Top N Nodes, Min TF-IDF, Min Occurrences, Min Connections, Edge Weight, Weak Signal Flag, Date Range.
3. **Transforms**: Rare Bridges, Niche Topics, Spiking Signals, Community Detection (Louvain), Centrality Score, Entity Resolution, LLM Annotate.
4. **Visualizers**: Interactive 2D Graph Preview, Table Preview, Timeline Preview.
5. **Outputs**: JSON Export, CSV Export, GraphML Export, Obsidian Vault Export, AI Report, HTML Dashboard, Commit to KuzuDB.
`
  },
  {
    id: 'ai-reports',
    num: 8,
    title: 'AI Intelligence Reports',
    category: 'Workflows',
    summary: 'Generating structured briefings, setting up AI models (Mistral Cloud vs. local Ollama), selecting context, and exporting to PDF/Markdown.',
    content: `# 8. AI Intelligence Reports (LLM Integration)

Hackmanite integrates with LLMs (Mistral AI Cloud & local Ollama endpoints) to generate structured analytical briefings from session entity graphs.

---

## Connection Setup

* **Mistral AI (Cloud)**: Enter API key (stored in secure client-side \`localStorage\`) and select \`mistral-large\` or \`open-mixtral\`.
* **Custom (Ollama / Local OpenAI Compatible)**: Base URL (e.g. \`http://localhost:11434/v1\`) and local model tag (\`llama3\`, \`mistral\`, \`phi3\`).

---

## Report Perspectives

* **Executive Summary**: Overview of dataset intelligence.
* **Threat Actor Focus**: Groups, targets, emails, IPs.
* **Network Clusters**: Graph co-occurrences and bridge connectors.
* **Temporal Timeline**: Operational chronologies and peak hours.
`
  },
  {
    id: 'architecture',
    num: 9,
    title: 'Project Architecture & System Design',
    category: 'Architecture',
    summary: 'High-level system architecture, monorepo directory schema, dual SQLite/KuzuDB schemas, and data flow pipelines.',
    content: `# 9. Project Architecture & System Design

Hackmanite implements a **decoupled, multi-service standalone desktop architecture** inside an Electron shell wrapper.

---

## Service Layer Overview

* **Electron Main Shell**: Orchestrates startup, PID monitoring, and clean subprocess termination.
* **Next.js Web Server (Port 3000)**: React UI frontend, Prisma client, and API router.
* **FastAPI NLP Engine (Port 8000)**: spaCy 3.7 entity extraction, Tesseract OCR, and Kùzu Python graph database manager.
* **SQLite (\`dev.db\`)**: Tabular metadata, sessions, files, emails, and pipelines.
* **KuzuDB (\`kuzu.db\`)**: Embedded graph database for ultra-fast Cypher entity/co-occurrence queries.

---

## Dual Database Architecture

### SQLite Relational Schema
* \`sessions\`, \`files\`, \`entities\`, \`occurrences\`, \`entity_neighborhoods\`, \`emails\`, \`pipelines\`, \`pipeline_runs\`.

### KuzuDB Graph Schema
* Node tables: \`Entity\` (\`id\`, \`canonical\`, \`type\`, \`metadata\`), \`FileRef\` (\`id\`).
* Relationship tables: \`OCCURS_IN\` (\`count\`, \`tfidf\`, \`excerpts\`), \`CO_OCCURS\` (\`weight\`, \`distance\`, \`snippet\`).
`
  }
];
