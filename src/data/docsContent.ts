export interface DocItem {
  id: string;
  title: string;
  category: 'Overview' | 'User Guides' | 'Workflows' | 'Architecture';
  summary: string;
  content: string;
}

export const DOCS_ITEMS: DocItem[] = [
  {
    id: 'readme',
    title: 'Hackmanite Overview & Quickstart',
    category: 'Overview',
    summary: 'Hackmanite DataLake Entity Graph Explorer features, tech stack, installation, and usage overview.',
    content: `# Hackmanite — DataLake Entity Graph Explorer

> **Version 1.0.0**

Hackmanite is a high-performance desktop and web application built for extracting, exploring, and visualizing **named entities** (persons, organizations, locations, dates, emails, phone numbers) from document archives. It supports a wide variety of file formats and provides an interactive graph interface to navigate relationships between entities across sessions.

*This project was made in collaboration with [GEODE](https://geode.science/).*

---

## Key Features

- **Multi-format document ingestion** — PDF, DOCX, PPTX, XLSX, images, HTML, plain text, and email archives (.eml, .pst)
- **NLP entity extraction** — powered by [spaCy](https://spacy.io/) with large language models for English, French, and Russian
- **OCR support** — extract entities from scanned images and image-based PDFs via Tesseract OCR
- **Interactive entity graph** — progressive Cytoscape.js visualization handling up to 50,000 nodes, loaded in batches
- **Session management** — save, reload, and switch between multiple named sessions (SQLite-backed)
- **Weak Signals Discovery** — compute structural brokers (Rare Bridges), localized topics (Niche Topics), and temporal surges (Spiking Signals)
- **Visual Pipeline Builder** — compose reusable graph-processing workflows with sources, filters, transforms, visualizers, and export nodes
- **AI Intelligence Briefings** — generate structured analytical briefings on session data using Mistral AI models or local Ollama endpoints
- **Multi-format exports** — export filtered graph data as JSON, GraphML, Obsidian Markdown vaults, or AI-generated Markdown reports
- **Standalone desktop app** — compiled binaries with Electron, no external Docker or Python required on end-user machines

---

## Tech Stack Architecture

| Layer | Technology |
|---|---|
| Desktop shell | [Electron](https://www.electronjs.org/) v30 |
| Frontend | [Next.js](https://nextjs.org/) 14 (React, TypeScript, Tailwind CSS) |
| Graph visualization | [Cytoscape.js](https://js.cytoscape.org/) (progressive batched loading) |
| Relational database | SQLite via [Prisma](https://www.prisma.io/) — sessions, files, emails, occurrences |
| Graph database | [KuzuDB](https://kuzudb.com/) (embedded C++ graph DB) — entities, co-occurrences |
| NLP backend | [FastAPI](https://fastapi.tiangolo.com/) + [spaCy](https://spacy.io/) 3.7 |
| Job Queue | [BullMQ](https://bullmq.io/) (Redis backend with in-memory fallback) |
| OCR Engine | [Tesseract OCR](https://github.com/UB-Mannheim/tesseract/wiki) via \`pytesseract\` |

### Bundled spaCy Language Models

| Language | spaCy Model Name |
|---|---|
| English | \`en_core_web_lg\` |
| French | \`fr_core_news_lg\` |
| Russian | \`ru_core_news_lg\` |

---

## System Requirements

- **OS**: Windows 10/11 (64-bit), macOS, or Linux
- **RAM**: 8 GB minimum (16 GB recommended for large document sets)
- **Disk Space**: 3 GB for application binaries, spaCy models, and database
`
  },
  {
    id: 'getting-started',
    title: '1. Getting Started',
    category: 'User Guides',
    summary: 'Running the application, uploading files into the dropzone, file extraction queue, and OCR Tesseract setup.',
    content: `# 1. Getting Started with Hackmanite

Hackmanite is designed to run locally on your system, processing files and keeping all data fully private. This guide covers how to launch the application, ingest files, and set up Optical Character Recognition (OCR) for scanned documents.

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
* **Asynchronous Processing**: Files are processed in the background one by one with status indicators: \`Processing\`, \`Success\`, or \`Failed\`.
* **Progress Tracking**: The top bar displays total files, completed files, and any errors encountered.
* **Explore Graph**: Once at least one file is successfully processed, the **Explore Graph** button will activate.

---

## Optical Character Recognition (OCR)

To extract entities from scanned documents, image-based PDFs, or standalone images, Hackmanite uses **Tesseract OCR**.

> **Note on OCR**: To enable OCR, install Tesseract OCR on your machine. Without it, image files will not yield text content, and scanned PDFs will appear blank.

### Installing Tesseract OCR:
* **Windows**: Run \`winget install UB-Mannheim.TesseractOCR\` in PowerShell (Admin).
* **macOS**: Run \`brew install tesseract\`.
* **Linux**: Run \`sudo apt install tesseract-ocr\`.
`
  },
  {
    id: 'session-management',
    title: '2. Session Management & Portability',
    category: 'User Guides',
    summary: 'Creating and switching sessions, dual database storage (SQLite + KuzuDB), and exporting/importing snapshots (JSON, GraphML, Obsidian Vault).',
    content: `# 2. Session Management & Data Portability

Hackmanite supports working on separate datasets or investigations simultaneously using **Sessions**. Each session has its own document list, graph database, extraction parameters, and layout settings.

---

## Relational Metadata & Graph Databases

Under the hood, Hackmanite maintains a dual-database design to store session data efficiently:
1. **SQLite Database (\`dev.db\` / \`production.db\`)**: Stores metadata, session information, file names, status, file-entity mappings, occurrence excerpts, and structured email details.
2. **KuzuDB (Embedded Graph DB)**: An embedded graph database storing entity nodes, category properties, and co-occurrence edges for fast graph traversals.

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
* **Obsidian Graph View**: Open Obsidian and press \`Ctrl + G\` to view 2D/3D graph connections.
`
  },
  {
    id: 'graph-explorer',
    title: '3. Interactive Graph Explorer',
    category: 'User Guides',
    summary: 'Interactive Cytoscape.js network canvas, layout customization, progressive rendering, filter sliders, and node legends.',
    content: `# 3. Interactive Graph Explorer

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
* **Progress Bar**: Shows currently loaded node count (e.g. \`500 / 12,000\`).
* **Load More**: Click **Load More** to fetch the next batch of nodes sorted by centrality.
* **Expand on Double-Click**: Double-clicking a node fetches all immediate neighbors from the database.
`
  },
  {
    id: 'co-occurrence',
    title: '4. Co-occurrence Analysis',
    category: 'User Guides',
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
    title: '5. Emails Dashboard',
    category: 'User Guides',
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
    title: '6. Weak Signals Discovery Engine',
    category: 'Workflows',
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
    title: '7. Pipeline Builder',
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
    title: '8. AI Intelligence Reports',
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
    title: '9. Project Architecture & System Design',
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
