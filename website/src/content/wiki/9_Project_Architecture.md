# 9. Project Architecture & System Design

Hackmanite (EntityGraph Explorer) implements a **decoupled, multi-service standalone desktop architecture** inside an Electron shell wrapper. This document details the component boundaries, IPC communications, dual database engine setup, file processing pipelines, and build targets.

---

## 1. High-Level System Topology

```mermaid
graph TB
    subgraph DesktopShell["Desktop Application Container (Electron v30)"]
        Main["Electron Main Process (main.ts)"]
        Splash["Splash Window (loading.html)"]
        MainWindow["App Window (BrowserWindow)"]
        
        subgraph WebServerService["Next.js Web Server (Node.js Sidecar - Port 3000)"]
            NextServer["Next.js 14 Server (React UI & API Routes)"]
            PrismaClient["Prisma ORM Client"]
            BullQueue["BullMQ Job Queue (In-Memory / Redis)"]
        end

        subgraph NLPService["NLP & Graph Service (Python Sidecar - Port 8000)"]
            FastAPI["FastAPI App (uvicorn)"]
            spaCyEngine["spaCy 3.7 Engine (NER Models)"]
            TesseractOCR["pytesseract (OCR Engine)"]
            KuzuDBEngine["Kùzu DB Python Client (C++ Embedded Graph Engine)"]
        end

        subgraph FileStorage["Local Filesystem Storage"]
            SQLiteFile[("SQLite DB (dev.db)")]
            KuzuDir[("Kùzu Graph Dir (.kuzudb)")]
            UploadDir["Uploaded Files"]
        end
    end

    Main -->|1. Spawns Sidecars| NextServer
    Main -->|2. Spawns Sidecars| FastAPI
    MainWindow -->|3. Loads UI| NextServer
    NextServer -->|4. HTTP Calls| FastAPI
    PrismaClient -->|5. Read/Write| SQLiteFile
    FastAPI -->|6. Cypher Queries| KuzuDir
    FastAPI -->|7. OCR Parsing| TesseractOCR
    spaCyEngine -->|8. Extract Entities| FastAPI
```

---

## 2. Directory Structure Schema

The repository is organized as a monorepo containing self-contained applications under `apps/` and infrastructure assets under `infra/`.

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': { 'textColor': '#ffffff', 'edgeLabelBackground': '#1e293b' }}}%%
graph LR
    Root["EntityGraph/ (Root)"] --> Apps["apps/ (Applications)"]
    Root --> Website["website/ (Documentation SPA)"]
    Root --> Wiki["wiki/ (Markdown Guides)"]
    Root --> Workflows[".github/workflows/ (CI/CD Pipelines)"]
    Root --> Infra["infra/ (Container Configs)"]
    Root --> RootFiles["Root Files (.env, docker-compose.yml, README.md)"]

    Apps --> Desktop["desktop/ (Electron Shell)"]
    Apps --> Web["web/ (Next.js 14 Web App)"]
    Apps --> NLP["nlp-service/ (FastAPI + spaCy NLP)"]

    Desktop --> DMain["main.js & preload.js & splash.html"]
    Desktop --> DLib["lib/ (boot-services, process-manager, window-manager, ipc-handlers, tray)"]

    Web --> WApp["app/ (App Router Pages & API Routes)"]
    Web --> WPrisma["prisma/ (schema.prisma)"]
    Web --> WComp["components/, hooks/, lib/, styles/"]

    NLP --> NMain["main.py"]
    NLP --> NDb["db/ (connection.py, schema.py, writers.py)"]
    NLP --> NRoutes["routers/ (extract.py, graph.py, tesseract.py)"]
    NLP --> NSvc["services/ (dispatcher, file_to_text, entity_extraction, email_parser, ocr...)"]

    Website --> WebSrc["src/ (Components, Help Center, Mermaid Renderer)"]
    Website --> WebContent["src/content/ (Markdown Auto-Importer)"]
    Website --> WebVite["vite.config.ts (Base Path & GitHub Pages Config)"]

    Workflows --> GHActions["deploy-docs.yml (GitHub Actions Deployment)"]

    Infra --> IDb["redis/ (Queue Configs)"]

    style Root fill:#7c3aed,stroke:#a78bfa,stroke-width:2px,color:#fff
    style Apps fill:#1e293b,stroke:#475569,stroke-width:1px,color:#fff
    style Website fill:#1e293b,stroke:#475569,stroke-width:1px,color:#fff
    style Wiki fill:#1e293b,stroke:#475569,stroke-width:1px,color:#fff
    style Workflows fill:#1e293b,stroke:#475569,stroke-width:1px,color:#fff
    style Infra fill:#1e293b,stroke:#475569,stroke-width:1px,color:#fff
    style Desktop fill:#18171c,stroke:#a78bfa,stroke-width:1px,color:#fff
    style Web fill:#18171c,stroke:#a78bfa,stroke-width:1px,color:#fff
    style NLP fill:#18171c,stroke:#a78bfa,stroke-width:1px,color:#fff
```

---

## 3. Database & Graph Schemas

Hackmanite adopts a **dual-database design** to maximize performance. **SQLite** manages tabular, transactional relational metadata and custom pipeline workflows, while **KuzuDB** handles highly complex graph traversals and co-occurrences.

### 3.1 SQLite Relational Schema (via Prisma)

```mermaid
erDiagram
    SESSIONS ||--o{ FILES : contains
    FILES ||--o{ OCCURRENCES : records
    FILES ||--o{ ENTITY_NEIGHBORHOODS : computes
    FILES ||--o{ EMAILS : extracts
    ENTITIES ||--o{ OCCURRENCES : references
    PIPELINES ||--o{ PIPELINE_RUNS : executes

    SESSIONS {
        string id PK
        string createdAt
        string expiresAt
        int windowSize
        int minConnections
    }

    FILES {
        string id PK
        string sessionId FK
        string originalName
        string mimeType
        string status
    }

    ENTITIES {
        string id PK
        string canonical
        string displayName
        string type
    }

    OCCURRENCES {
        string id PK
        string entityId FK
        string fileId FK
        int count
        float tfidf
    }

    ENTITY_NEIGHBORHOODS {
        string id PK
        string fileId FK
        string sourceEntityId FK
        string targetEntityId FK
        float weight
    }

    EMAILS {
        string id PK
        string fileId FK
        string subject
        string from
        string to
    }

    PIPELINES {
        string id PK
        string name
        string definition
    }

    PIPELINE_RUNS {
        string id PK
        string pipelineId FK
        string status
    }
```

### 3.2 KuzuDB Graph Database Schema

```mermaid
classDiagram
    class Entity {
        +String id
        +String canonical
        +String display_name
        +String type
        +String metadata
    }
    class FileRef {
        +String id
    }
    Entity --> FileRef : OCCURS_IN
    Entity --> Entity : CO_OCCURS
```

---

## 4. Data Ingestion Pipeline Schema

The diagram below details the asynchronous ingestion lifecycle of a document, tracking its path from the user interface through the scheduling queue, the text extraction/OCR parsing engines, the NLP named entity recognition parser, and into storage.

```mermaid
graph TD
    subgraph ClientUI["Client UI (Next.js Renderer)"]
        Upload["1. User Uploads Document (PDF, Word, Image, EML...)"]
        Status["7. Polls Ingestion Job Status & Renders Graph"]
    end

    subgraph WebBackend["Web App Service (Next.js Backend)"]
        APIRoute["2. API Upload Route (/api/upload)"]
        SQLite_Pending[("3. SQLite (Prisma) File status set to PENDING")]
        Unified_Queue["4. Unified Queue Manager (lib/queue/index.ts)"]
        BullMQ_Driver["BullMQ Worker Thread (If Redis is active)"]
        Memory_Driver["MemoryQueue Process (Standalone desktop mode)"]
    end

    subgraph QueueBroker["Job Queue Broker (Optional)"]
        Redis_Broker[("Redis Server (Distributed task broker)")]
    end

    subgraph NLPService["NLP & Graph Service (FastAPI)"]
        FastAPI_Extract["6. POST /extract Endpoint (main.py)"]
        Dispatcher["MIME Dispatcher (dispatcher.py)"]
        
        Parser_Office["Office Extractor (docx, xlsx, pptx)"]
        Parser_PDF["PDF Extractor (pypdf reader)"]
        Parser_Email["Email Parser (email_parser.py)"]
        Parser_OCR["OCR Engine (Tesseract via pytesseract)"]

        spaCy_NER["spaCy NER Pipeline (en / fr / ru models)"]
        CoOccur["Co-occurrence Calculator (Token sentence sliding window)"]
        
        Kuzu_Write[("KuzuDB (Graph database) Writes Node & Edge tables")]
        SQLite_Write[("SQLite Writes occurrences & updates status")]
    end

    Upload --> APIRoute
    APIRoute --> SQLite_Pending
    APIRoute --> Unified_Queue
    
    Unified_Queue --> BullMQ_Driver
    Unified_Queue --> Memory_Driver
    BullMQ_Driver --> Redis_Broker
    
    BullMQ_Driver --> FastAPI_Extract
    Memory_Driver --> FastAPI_Extract
    FastAPI_Extract --> Dispatcher
    
    Dispatcher --> Parser_Office
    Dispatcher --> Parser_PDF
    Dispatcher --> Parser_Email
    Dispatcher --> Parser_OCR

    Parser_Office --> spaCy_NER
    Parser_PDF --> spaCy_NER
    Parser_Email --> spaCy_NER
    Parser_OCR --> spaCy_NER

    spaCy_NER --> CoOccur
    CoOccur --> Kuzu_Write
    CoOccur --> SQLite_Write
    
    SQLite_Write -.-> Status
```
