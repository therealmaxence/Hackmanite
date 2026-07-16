# Hackmanite — DataLake Entity Graph Explorer

> **Version 1.0.0** · Standalone Windows Desktop Application

Hackmanite is a desktop application for extracting, exploring, and visualizing **named entities** (persons, organizations, locations, dates, emails, phone numbers, …) from documents. It supports a wide variety of file formats and provides an interactive graph interface to navigate relationships between entities across sessions.

---

## Features

- **Multi-format document ingestion** — PDF, DOCX, PPTX, XLSX, images, HTML, plain text
- **NLP entity extraction** — powered by [spaCy](https://spacy.io/) with large language models for English, French, and Russian
- **OCR support** — extract entities from scanned images and image-based PDFs via Tesseract
- **Interactive entity graph** — progressive visualization of up to 50,000 nodes, loaded in batches
- **Session management** — save, reload, and switch between multiple named sessions (SQLite-backed)
- **Entity dashboard** — browse, filter, and manage all extracted entities
- **AI Intelligence Report** — generate structured analytical briefings on session data using Mistral AI models
- **Pipeline Builder** — compose reusable graph-processing workflows with sources, filters, transforms, visualizers, and export nodes
- **LLM graph transforms** — annotate graph entities with custom AI prompts inside a pipeline
- **Multi-format graph exports** — export filtered graph data as JSON, GraphML, Obsidian vaults, or AI-generated Markdown reports
- **Standalone desktop app** — no Docker, no Python, no Node.js required on end-user machines

---

## Project Structure

```
EntityGraph/
├── apps/
│   ├── desktop/                  # Electron wrapper (main process, splash screen, packaging)
│   │   ├── main.js               # App entry point — orchestrates startup and window lifecycle
│   │   ├── preload.js            # Electron preload script (context bridge)
│   │   ├── splash.html           # Loading screen shown at startup
│   │   ├── builder-config.json   # electron-builder packaging configuration
│   │   └── lib/                  # Desktop helper modules
│   │       ├── boot-services.js  # Spawns and monitors NLP & web services
│   │       ├── ipc-handlers.js   # Electron IPC channel registration
│   │       ├── process-manager.js# Subprocess lifecycle (kill, track PIDs)
│   │       ├── session-secret.js # Generates/persists the session secret
│   │       ├── tray.js           # System-tray icon and context menu
│   │       └── window-manager.js # BrowserWindow creation and management
│   ├── web/                      # Next.js frontend (UI, API routes, Prisma/SQLite)
│   │   ├── components/pipeline/  # Pipeline canvas and node configuration UI
│   │   ├── lib/pipeline/         # Pipeline executor, node handlers, exports, weak-signal transforms
│   │   └── prisma/               # Prisma schema & SQLite dev database (dev.db)
│   ├── nlp-service/              # FastAPI + spaCy NLP backend
│   │   ├── main.py               # FastAPI app entry point
│   │   ├── db/                   # KuzuDB graph database layer (connection, schema, queries)
│   │   ├── models/               # Pydantic schemas shared across the service
│   │   ├── routers/              # API route handlers (extract, graph read/query endpoints)
│   │   └── services/             # Entity extraction, OCR, file parsing logic & spec
│   └── tests/                    # Ingestion testing files (.eml samples)
├── data/                         # Persistent app data and uploads (Docker volume mounts)
│   ├── uploads/                  # Uploaded documents
│   └── db/                       # SQLite database (production / Docker)
├── docker-compose.yml            # Production Docker Compose (web, nlp)
├── docker-compose.dev.yml        # Development overrides (hot-reload, volume mounts)
├── docker-compose.kafka.yml      # Distributed extension (adds Kafka broker & daemons)
├── .env.example                  # Environment variable template
└── README.md
```

---

## First-Time Setup (Development)

After cloning the repository, follow these steps once before running the app.

### 1. Install Node.js dependencies

```powershell
# Web frontend
cd apps/web
npm install

# Electron shell
cd ../desktop
npm install
```

### 2. Install Python dependencies

```powershell
cd apps/nlp-service
pip install -r requirements.txt

# Download spaCy language models
python -m spacy download en_core_web_lg
python -m spacy download fr_core_news_lg
python -m spacy download ru_core_news_lg
```

### 3. Create the environment file

Copy the example at the **repository root** and fill in values:

```powershell
# From the repository root (EntityGraph/)
copy .env.example .env   # then edit .env
```

Minimum required content for local development (`.env`):

```env
DATABASE_URL="file:./apps/web/prisma/dev.db?connection_limit=1&socket_timeout=900"
SESSION_SECRET="generate_32_char_random_string_here"
NLP_SERVICE_URL="http://127.0.0.1:8000"
MAX_FILE_SIZE_MB=100
UPLOAD_DIR="./uploads"
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Optional variables (see `.env.example` for the full list):

```env
KUZU_BUFFER_POOL_SIZE=                # leave empty for auto-scaling
LOG_LEVEL=info
```

Optional — override the KuzuDB data directory (default: `./kuzu_data` next to `main.py`):

```env
# In apps/nlp-service/ environment or shell
KUZU_DB_PATH="./kuzu_data"
```

### 4. Initialize the database

```powershell
cd apps/web
npx prisma db push
```

This creates the local SQLite database (`apps/web/prisma/dev.db`). The KuzuDB graph database (`kuzu_data/`) is created automatically on first NLP service startup.

---

## Running the App

### Option A — Development mode (native processes)

Open three separate terminals and execute the following:

```powershell
# Terminal 1 — NLP service
cd apps/nlp-service
uvicorn main:app --host 0.0.0.0 --port 8000

# Terminal 2 — Web frontend
cd apps/web
npm run dev

# Terminal 3 — Electron shell
cd apps/desktop
npm start
```

### Option B — Development mode (Docker)

Requires Docker Desktop. Uses the root `.env` for secrets and hot-reloads source changes.
Pipeline runs and document upload extractions are executed inside a local in-memory fallback queue (default mode).

```powershell
# From the repository root

# Production
docker compose -f docker-compose.yml up --build

# Development (hot-reload)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Services started: `web` (Next.js, port 3000), `nlp` (FastAPI, port 8000).

### Option C — Portable ZIP (no installation needed)

> Use **[7-Zip](https://www.7-zip.org/)** to extract — Windows' built-in extractor can silently corrupt files in large ZIPs.

1. Right-click `Hackmanite-1.0.0-win.zip` → **7-Zip → Extract Here**
2. Double-click **`Hackmanite.exe`** inside the extracted folder
3. Done

Everything (Python runtime, spaCy models, Next.js server) is bundled inside the ZIP. No Python, Node.js, or Docker required.

### Option D — Distributed Kafka mode (Docker)

Runs the full stack with background task processing (pipeline runs and document upload extractions) distributed over **Apache Kafka**.
The Kafka broker, Pipeline Coordinator, and Pipeline Worker are all started automatically as Docker services.
No manual daemon terminals required.

```powershell
# From the repository root

# Production
docker compose -f docker-compose.yml -f docker-compose.kafka.yml up --build

# Development (hot-reload on web + nlp)
docker compose -f docker-compose.yml -f docker-compose.kafka.yml -f docker-compose.dev.yml up --build
```

Services started:

| Service | Port | Description |
|---|---|---|
| `web` | 3000 | Next.js frontend |
| `nlp` | 8000 | FastAPI NLP backend |
| `kafka` | 9092 | Kafka broker (KRaft mode) |
| `coordinator` | — | Pipeline Coordinator daemon |
| `worker` | — | Pipeline Worker daemon |

The `web` service automatically dispatches pipeline runs and document upload extraction tasks to Kafka when `KAFKA_BOOTSTRAP_SERVERS` is set. The coordinator and worker share the same upload volume for database access and Claim Check payload caching.

For detailed architectural layout, see [Distributed Kafka Pipeline Wiki](wiki/9_Distributed_Kafka_Pipeline.md).

---

## Exporting to Obsidian

You can export your session's entity graph to Obsidian to explore and search nodes locally:

1. In the Graph view sidebar, click **Export Obsidian**.
2. Customize your graph pruning preferences in the settings modal (top nodes limit, min occurrences, min connections, weight threshold, and entity categories) and click **Export**.
3. Extract the downloaded `session-<id>-obsidian.zip` archive to a folder on your system (e.g., `My_Graph_Vault`).
4. Open the **Obsidian** application.
5. Select **Open folder as vault** and choose the extracted folder.
6. Press **`Ctrl + G`** (or click the Graph icon in the left menu) to view your dynamic, interactive entity graph.

---

## Pipeline Builder

The **Pipelines** page lets you build reusable graph-processing workflows from visual nodes. Nodes are connected directly on the canvas by dragging from the right-side connector area of one node to another node, inspired by node editors such as Blender and n8n.

### Node categories

| Category | Available nodes |
|---|---|
| Sources | SQLite Query, KuzuDB Query, Document File, Email File, CSV File, GraphML File, Web Scraper, Active Session Graph |
| Filters | Entity Category, Top N Nodes, Min TF-IDF, Min Occurrences, Min Connections, Edge Weight, Weak Signal, Allow/Deny List, Date Range |
| Transforms | Rare Bridges, Niche Topics, Spiking Signals, LLM Annotate, Community Detection, Centrality Score, Entity Resolution |
| Visualizers | Graph Preview, Table Preview, Timeline Preview |
| Outputs | JSON Export, CSV Export, GraphML Export, Obsidian Export, AI Report, HTML Dashboard, Commit to KuzuDB |

### Pipeline highlights

- **Curved graph canvas**: pipeline edges render as curved arrows, and running nodes glow while execution is in progress.
- **Configurable document extraction**: Document File and Email File sources expose the NLP extraction `windowSize` instead of using a hidden fixed value.
- **Min TF-IDF filtering**: prune entities below a configurable TF-IDF threshold.
- **Weak-signal parameters**: rare bridge occurrence caps, niche topic file caps, and spiking signal window/concentration settings are editable and used at runtime.
- **LLM Annotate transform**: send a bounded graph context to an OpenAI-compatible LLM endpoint and merge returned annotations or metadata back into graph nodes.
- **AI Report output**: generate a Markdown analytical report from pipeline graph data using the same shared report-building logic as the AI Report page.
- **Export destinations**: JSON, GraphML, and Obsidian outputs can download directly in the browser, write to the active session export folder, or write to a custom server folder.

The KuzuDB Query source uses a read-only NLP service endpoint. Write-like Cypher keywords are rejected before execution.

---

## Weak Signals Discovery

Analyze early-warning indicators, broker connections, and niche topics across your documents:

- **Rare Bridges**: Identifies nodes with low global occurrences that act as critical topological links between clusters in the co-occurrence network.
- **Niche Topics**: Isolates specific, localized topics appearing in at most 2 files with high local TF-IDF salience.
- **Spiking Signals**: Detects temporal spikes anywhere across the timeline using a sliding time window (20% of total duration width, moving in steps of 10%) where $\ge 60\%$ of occurrences are concentrated.
- **Graph Visual Highlights**: Visualizes weak signals on the interactive graph with a dashed border and a pulsing neon purple shadow/glow.

---

## AI Intelligence Report (LLM Integration)

Generate executive intelligence briefings based on your session's entity graph, document contents, and selected weak signals:

The AI Report page and the pipeline **AI Report** output share the same report data builder, so session reports and pipeline-generated reports use a consistent graph summary, bridge analysis, entity counts, file metadata, and timeline context.

1. Navigate to the **AI Report** page from the header bar.
2. Configure your **AI Connection Setup**:
   - **Provider**: Choose between **Mistral AI (Cloud)** and **Custom (Ollama/OpenAI compatible)**.
   - **API Endpoint URL**: For custom configurations, specify any OpenAI-compatible base URL (e.g. local Ollama server at `http://localhost:11434/v1`).
   - **API Key**: Input your provider credentials (saved securely in client-side `localStorage`).
   - **Model**: Select pre-defined Mistral models or override with a custom model tag (e.g. `llama3`, `mistral`, `phi3`).
3. Select **Weak Signals**: Check/uncheck specific rare bridges, niche topics, or emerging signals using the collapsible selection panel (equipped with global and category-level bulk checkboxes) to feed factual context to the analyst prompt.
4. Select your **Model Focus**:
   - *Executive Summary*: General intelligence analysis of the entire dataset.
   - *Threat Actor Focus*: Focuses on threat actors, targets, emails, organizations, and IP infrastructure.
   - *Network Clusters*: Focuses on graph co-occurrences, bridges, and cluster linkages.
   - *Temporal Timeline*: Focuses on chronologies, Peak Activity hours, and operational sequences.
5. Tune extraction limits using the custom sliders (Top Entities count, Salient TF-IDF Entities, and Central Bridge Nodes) and add optional analyst directives.
6. Click **Run AI Analysis** (always visible at the bottom of the config column) to generate the briefing.
7. Use the briefing panel header to **Copy** the report, **Download MD** (save as Markdown file), or **Print PDF** (compiled with a custom printer-friendly stylesheet).

Pipeline reports can also be generated as part of an automated workflow from the **Pipelines** page. The pipeline output supports Mistral or a custom OpenAI-compatible endpoint, model override, focus type, and analyst directives.

---

## Building the Portable ZIP

Run these commands in order after any code change:

```powershell
# 1. Build the Next.js frontend (production bundle for Electron)
cd apps/web
# In PowerShell:
$env:BUILD_DIR="next-production"; npm run build
# In bash/sh:
# BUILD_DIR=next-production npm run build

# 2. Recompile the Python NLP service (only if Python code changed)
cd ../nlp-service
pyinstaller hackmanite-nlp.spec --noconfirm

# 3. Package everything into a ZIP
cd ../desktop
npm run dist
```

Output: `apps/desktop/dist/Hackmanite-1.0.0-win.zip`

### Building for Linux/Ubuntu

Because native Node modules (Prisma, KuzuDB) and Python executables must be compiled for the target platform, cross-compilation from Windows is not supported. To build a Linux AppImage or deb package, run the following steps on an Ubuntu system or WSL:

```bash
# 1. Install packaging dependencies
sudo apt-get update && sudo apt-get install -y dpkg fakeroot libarchive-tools

# 2. Build the Next.js production web server
cd apps/web
npm install
BUILD_DIR="next-production" npm run build

# 3. Compile the Python NLP service (produces Linux ELF binary)
cd ../nlp-service
pip install -r requirements.txt
python -m spacy download en_core_web_lg
python -m spacy download fr_core_news_lg
python -m spacy download ru_core_news_lg
pip install pyinstaller
pyinstaller hackmanite-nlp.spec --noconfirm

# 4. Package Electron app for Linux (AppImage & deb)
cd ../desktop
npm install
npm run dist -- --linux
```

Output: `apps/desktop/dist/Hackmanite-1.0.0.AppImage` & `apps/desktop/dist/Hackmanite_1.0.0_amd64.deb`

### Installing & Running on Linux

To install the generated Debian (`.deb`) package:
```bash
sudo apt update
sudo apt install ./apps/desktop/dist/Hackmanite_1.0.0_amd64.deb
```

To run the standalone `AppImage`:
```bash
chmod +x apps/desktop/dist/Hackmanite-1.0.0.AppImage
./apps/desktop/dist/Hackmanite-1.0.0.AppImage
```

### Partial rebuilds

| What changed | Steps needed |
|---|---|
| Frontend only (UI, pages) | `apps/web: $env:BUILD_DIR="next-production"; npm run build` → `apps/desktop: npm run dist` |
| Python NLP only (extraction, OCR, graph DB) | `apps/nlp-service: pyinstaller hackmanite-nlp.spec --noconfirm` → `apps/desktop: npm run dist` |
| Electron only (window, splash) | `apps/desktop: npm run dist` only |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | [Electron](https://www.electronjs.org/) v30 |
| Frontend | [Next.js](https://nextjs.org/) 14 (React, TypeScript) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) |
| Graph visualization | [Cytoscape.js](https://js.cytoscape.org/) (progressive batched loading) |
| Relational database | SQLite via [Prisma](https://www.prisma.io/) — sessions, files, emails |
| Graph database | [KuzuDB](https://kuzudb.com/) (embedded) — entities, co-occurrences |
| NLP backend | [FastAPI](https://fastapi.tiangolo.com/) + [spaCy](https://spacy.io/) 3.7 |
| Job Queue | Local in-memory queue (default) or [Apache Kafka](https://kafka.apache.org/) (distributed mode) |
| OCR | [Tesseract](https://github.com/UB-Mannheim/tesseract/wiki) via `pytesseract` |
| Packaging | [electron-builder](https://www.electron.build/) + [PyInstaller](https://pyinstaller.org/) |

### Bundled spaCy models

| Language | Model |
|---|---|
| English | `en_core_web_lg` |
| French | `fr_core_news_lg` |
| Russian | `ru_core_news_lg` |

---

## System Requirements

### For development

| Tool | Version |
|---|---|
| Node.js | ≥ 18 |
| Python | ≥ 3.10 |
| Docker Desktop | Any *(optional — Docker mode only)* |
| Tesseract OCR | Any *(optional — OCR only)* |

- Tesseract download: https://github.com/UB-Mannheim/tesseract/wiki
- The app auto-detects Tesseract at its default installation path

### For end users (portable ZIP)

- **Windows 10/11** (64-bit)
- **7-Zip** for extraction
- **Tesseract OCR** *(optional)* — only needed for OCR features

---

## Versioning

To release a new version, update the version field in [`apps/desktop/package.json`](apps/desktop/package.json):

```json
{
  "version": "1.0.0"
}
```

Then rebuild using the steps above. The ZIP filename will automatically reflect the new version.

---

## Documentation

This project has auto-generated documentation setups for the backend services, frontend components, and database schemas.

### 1. Python API & NLP Backend (`apps/nlp-service`)
Documentation is powered by **MkDocs** and **mkdocstrings**.
- **Install dependencies**:
  ```powershell
  cd apps/nlp-service
  pip install -r requirements-dev.txt
  ```
- **Run dev server**:
  ```powershell
  mkdocs serve
  ```
- **Build static site**:
  ```powershell
  mkdocs build
  ```
  The output will be created in `apps/nlp-service/site/`.

### 2. Next.js Frontend & Core Logic (`apps/web`)
Documentation is powered by **TypeDoc** (for TypeScript) and **Prisma Docs Generator** (for database schemas).
- **TypeDoc**:
  - **Generate**:
    ```powershell
    cd apps/web
    npm run docs:generate
    ```
    The HTML documentation will be created in `apps/web/docs/typedoc/`.
- **Prisma Schema**:
  - **Generate**:
    ```powershell
    cd apps/web
    npx prisma generate
    ```
    The schema documentation site is auto-generated inside `apps/web/docs/prisma/` whenever you run prisma generator commands.

---

## License

MIT
