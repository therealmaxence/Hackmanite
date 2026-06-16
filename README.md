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
- **Standalone desktop app** — no Docker, no Python, no Node.js required on end-user machines

---

## Project Structure

```
EntityGraph/
├── apps/
│   ├── desktop/          # Electron wrapper (main process, splash screen, packaging)
│   │   ├── main.js       # App entry point — spawns web & NLP services
│   │   ├── splash.html   # Loading screen shown at startup
│   │   └── builder-config.json  # electron-builder packaging configuration
│   ├── web/              # Next.js frontend (UI, API routes, Prisma/SQLite)
│   ├── nlp-service/      # FastAPI + spaCy NLP backend
│   │   ├── main.py       # FastAPI app entry point
│   │   ├── db/           # KuzuDB graph database layer (connection, schema, queries)
│   │   ├── routers/      # API route handlers (extract, graph read endpoints)
│   │   └── services/     # Entity extraction, OCR, file parsing logic & spec
│   ├── tests/            # Ingestion testing files (.eml samples)
│   └── data/             # SQLite development database location
├── data/                 # Persistent app data and uploads mapped by Docker volumes
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

Copy the example and fill in values:

```powershell
# In apps/web/
copy .env.example .env   # then edit .env
```

Minimum required content for local development (`apps/web/.env`):

```env
DATABASE_URL="file:./dev.db"
SESSION_SECRET="generate_32_char_random_string_here"
NLP_SERVICE_URL="http://127.0.0.1:8000"
MAX_FILE_SIZE_MB=500
UPLOAD_DIR="./uploads"
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
MISTRAL_API_KEY="your_optional_global_mistral_api_key"
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

This creates the local SQLite database (`prisma/dev.db`). The KuzuDB graph database (`kuzu_data/`) is created automatically on first NLP service startup.

---

## Running the App

### Option A — Development mode

To run the application locally in development, open three separate terminals and execute the following:

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

### Option B — Portable ZIP (no installation needed)

> Use **[7-Zip](https://www.7-zip.org/)** to extract — Windows' built-in extractor can silently corrupt files in large ZIPs.

1. Right-click `Hackmanite-1.0.0-win.zip` → **7-Zip → Extract Here**
2. Double-click **`Hackmanite.exe`** inside the extracted folder
3. Done

Everything (Python runtime, spaCy models, Next.js server) is bundled inside the ZIP. No Python, Node.js, or Docker required.

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

## AI Intelligence Report (Mistral AI)

You can generate executive intelligence briefings based on your session's entity graph and document contents using Mistral AI:

1. Navigate to the **AI Report** page from the header bar.
2. Enter your **Mistral API Key** (saved securely client-side in `localStorage`) or define it globally in your `.env` configuration.
3. Select your **Model** (e.g., `Mistral Large` or `Mistral Small`) and select your **Analysis Scope**:
   - *Executive Summary*: General intelligence analysis of the entire dataset.
   - *Threat Actor Focus*: Focuses on threat actors, targets, emails, organizations, and IP infrastructure.
   - *Network Clusters*: Focuses on graph co-occurrences, bridges, and cluster linkages.
   - *Temporal Timeline*: Focuses on chronologies, Peak Activity hours, and operational sequences.
4. Tune extraction limits using the custom sliders (Top Entities count, Salient TF-IDF Entities, and Central Bridge Nodes) and add optional analyst directives.
5. Click **Run AI Analysis** to generate the report.
6. Use the briefing panel header to **Copy** the report, **Download MD** (save as Markdown file), or **Print PDF** (compiled with a custom printer-friendly stylesheet).

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
| Job Queue | [BullMQ](https://bullmq.io/) (Redis backend with in-memory fallback) |
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

## License

MIT
