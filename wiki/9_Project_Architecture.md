# Project Architecture & General Structure Schema

This document provides a detailed overview of the system architecture, directory structure, data schemas, and information flow of **Hackmanite (EntityGraph Explorer)**. It is structured for direct inclusion or adaptation in written technical reports.

---

## 1. High-Level System Architecture

Hackmanite implements a **decoupled, multi-service standalone desktop architecture**. Instead of hosting services on a remote server, it compiles and runs a frontend UI web server, a relational metadata database, an embedded graph database, and a machine learning (NLP) pipeline locally inside an Electron shell wrapper.

### 1.1 Architectural Details
* **Process Lifecycle & Bootstrapping**: The Electron main process ([main.js](file:///c:/Users/maxen/Documents/POLYTECH/Stage_FI4/EntityGraph/EntityGraph/apps/desktop/main.js)) acts as the master controller. At boot, [boot-services.js](file:///c:/Users/maxen/Documents/POLYTECH/Stage_FI4/EntityGraph/EntityGraph/apps/desktop/lib/boot-services.js) performs pre-flight checks: it clears TCP port conflicts (killing processes on ports `3000` and `8000`), configures path variables, and spawns the Next.js and FastAPI services as background subprocesses using Node's `child_process.spawn`.
* **Subprocess Management**: Electron tracks child process PIDs and registers shutdown hooks (`app.on('will-quit')`) to ensure all subprocesses (Python NLP engine and Next.js server) are cleanly terminated, preventing orphaned background processes.
* **Database Relational Layer**: Relational structures (sessions, user files, extraction logs, and email objects) are stored in an SQLite database file (`dev.db`). During boot, Electron programmatically runs Prisma migrations (`npx prisma db push`) to synchronize the database schema without requiring external CLI tools.
* **Graph Database Layer**: Entity nodes and co-occurrence edges are stored in an embedded **KuzuDB** database instance. The database is accessed via Kùzu's Python API in the FastAPI process, operating directly on the file system at `kuzu_data/kuzu.db` under the user's OS-specific app data folder.
* **Communication Protocols**:
  * **Frontend-to-Backend**: The Electron BrowserWindow displays the Next.js client (`http://localhost:3000`).
  * **Inter-Service REST API**: Next.js server-side API routes proxy computationally intensive parsing and graph traversal operations to the FastAPI NLP engine (`http://127.0.0.1:8000`) using standard HTTP/REST requests.

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': { 'textColor': '#ffffff', 'edgeLabelBackground': '#1e293b' }}}%%
graph TB
    subgraph "Desktop Shell (Electron)"
        Main[main.js / boot-services.js]
        Splash[splash.html]
    end

    subgraph "Web App Service (Next.js)"
        WebPort[Port 3000]
        API[API Router / Routes]
        UI[Cytoscape.js UI & Dashboard]
        Prisma[Prisma Client]
        SQLite[(SQLite: dev.db)]
    end

    subgraph "NLP & Graph Service (FastAPI)"
        FastPort[Port 8000]
        spacy[spaCy / Tesseract OCR]
        kuzupy[Kùzu Python API]
        Kuzu[(KuzuDB: Graph DB)]
    end

    subgraph External
        LLM[Mistral AI / Ollama API]
    end

    %% Boot process
    Main -->|1. Spawns & configures| FastPort
    Main -->|2. Spawns & configures| WebPort
    Main -->|3. Loads UI in Browser Window| UI

    %% Web to NLP
    API -->|HTTP REST queries| FastPort
    UI -->|Internal API requests| API

    %% Databases
    Prisma -->|Read/Write Session & File metadata| SQLite
    kuzupy -->|Read/Write Graph Entities & Co-occurrences| Kuzu

    %% LLM calls
    API -.->|Request AI Intelligence Report| LLM

    style Main fill:#1e293b,stroke:#475569,stroke-width:1px,color:#fff
    style Splash fill:#1e293b,stroke:#475569,stroke-width:1px,color:#fff
    style WebPort fill:#1e293b,stroke:#475569,stroke-width:1px,color:#fff
    style API fill:#1e293b,stroke:#475569,stroke-width:1px,color:#fff
    style UI fill:#1e293b,stroke:#475569,stroke-width:1px,color:#fff
    style Prisma fill:#1e293b,stroke:#475569,stroke-width:1px,color:#fff
    style SQLite fill:#1e293b,stroke:#475569,stroke-width:1px,color:#fff
    style FastPort fill:#1e293b,stroke:#475569,stroke-width:1px,color:#fff
    style spacy fill:#1e293b,stroke:#475569,stroke-width:1px,color:#fff
    style kuzupy fill:#1e293b,stroke:#475569,stroke-width:1px,color:#fff
    style Kuzu fill:#1e293b,stroke:#475569,stroke-width:1px,color:#fff
    style LLM fill:#1e293b,stroke:#475569,stroke-width:1px,color:#fff
```

---

## 2. Directory Structure Schema

The repository is organized as a monorepo containing self-contained applications under `apps/` and infrastructure assets under `infra/`.

```mermaid
graph LR
    Root["EntityGraph/ (Root)"] --> Apps["apps/ (Applications)"]
    Root --> Infra["infra/ (Container Configs)"]
    Root --> RootFiles["Root Files (.env, docker-compose.yml, README.md)"]

    Apps --> Desktop["desktop/ (Electron Shell)"]
    Apps --> Web["web/ (Next.js 14 Web App)"]
    Apps --> NLP["nlp-service/ (FastAPI + spaCy NLP)"]
    Apps --> DevData["data/ (Dev SQLite DB)"]
    Apps --> Tests["tests/ (Test email samples)"]

    Desktop --> DMain["main.js & preload.js & splash.html"]
    Desktop --> DLib["lib/ (boot-services.js, process-manager.js, window-manager.js)"]

    Web --> WApp["app/ (App Router Pages & API Routes)"]
    Web --> WPrisma["prisma/ (schema.prisma)"]
    Web --> WComp["components/, hooks/, lib/, styles/"]

    NLP --> NMain["main.py"]
    NLP --> NDb["db/ (connection.py, schema.py, writers.py)"]
    NLP --> NRoutes["routers/ (extract.py, graph.py)"]
    NLP --> NSvc["services/ (dispatcher.py, file_to_text.py, entity_extraction.py)"]

    Infra --> IDb["mysql/ & redis/ & nginx/"]

    style Root fill:#f9f,stroke:#333,stroke-width:2px,color:#000
    style Apps fill:#bbf,stroke:#333,stroke-width:1px,color:#000
    style Infra fill:#bbf,stroke:#333,stroke-width:1px,color:#000
    style Desktop fill:#ddf,stroke:#333,stroke-width:1px,color:#000
    style Web fill:#ddf,stroke:#333,stroke-width:1px,color:#000
    style NLP fill:#ddf,stroke:#333,stroke-width:1px,color:#000
```

---

## 3. Database & Graph Schemas

Hackmanite adopts a **dual-database design** to maximize performance. **SQLite** manages tabular, transactional relational metadata, while **KuzuDB** handles highly complex graph traversals and co-occurrences.

### 3.1 SQLite Relational Schema (via Prisma)
Defined in [schema.prisma](file:///c:/Users/maxen/Documents/POLYTECH/Stage_FI4/EntityGraph/EntityGraph/apps/web/prisma/schema.prisma):

```mermaid
erDiagram
    sessions ||--o{ files : contains
    files ||--o{ occurrences : records
    files ||--o{ entity_neighborhoods : computes
    files ||--o{ emails : extracts
    entities ||--o{ occurrences : references
    entities ||--o{ entity_neighborhoods : "source"
    entities ||--o{ entity_neighborhoods : "target"

    sessions {
        String id PK
        DateTime createdAt
        DateTime expiresAt
        Int windowSize
        Int minConnections
        Int minOccurrences
        Float minEdgeWeight
        Float minTfidf
        String hiddenNodeIds
    }

    files {
        String id PK
        String sessionId FK
        String originalName
        String storagePath
        String mimeType
        BigInt sizeBytes
        String status
        String errorMessage
        DateTime uploadedAt
        DateTime processedAt
    }

    entities {
        String id PK
        String canonical
        String displayName
        String type
        String metadata
    }

    occurrences {
        String id PK
        String entityId FK
        String fileId FK
        Int count
        String excerpts
        Float tfidf
    }

    entity_neighborhoods {
        String id PK
        String fileId FK
        String sourceEntityId FK
        String targetEntityId FK
        Float weight
        Int distance
        String snippet
        Int sourceOffset
        Int targetOffset
    }

    emails {
        String id PK
        String fileId FK
        String messageId
        String inReplyTo
        String references
        String subject
        String from
        String to
        String cc
        DateTime date
        String body
    }
```

### 3.2 KuzuDB Graph Database Schema
Defined in [schema.py](file:///c:/Users/maxen/Documents/POLYTECH/Stage_FI4/EntityGraph/EntityGraph/apps/nlp-service/db/schema.py):

```mermaid
classDiagram
    class Entity {
        String id
        String canonical
        String display_name
        String type
        String metadata
    }
    class FileRef {
        String id
    }
    Entity --> FileRef : "OCCURS_IN (count, tfidf, excerpts)"
    Entity --> Entity : "CO_OCCURS (weight, distance, snippet, file_id)"
```

#### Node Tables
* **`Entity`**:
  * `id` (STRING, Primary Key): Unique identifier of the entity.
  * `canonical` (STRING): Case-insensitive standard representation of the name.
  * `display_name` (STRING): Formatted name for UI rendering.
  * `type` (STRING): Entity classification (e.g. `PERSON`, `ORG`, `LOC`, `EMAIL`, `PHONE`).
  * `metadata` (STRING): Structured JSON storing entity context.
* **`FileRef`**:
  * `id` (STRING, Primary Key): ID referencing the corresponding `File` record in SQLite.

#### Relationship Tables
* **`OCCURS_IN`** (From `Entity` to `FileRef`):
  * `count` (INT64): Frequency of the entity within the document.
  * `tfidf` (DOUBLE): Relative statistical salience of the entity in the file.
  * `excerpts` (STRING): Text fragments containing occurrences.
* **`CO_OCCURS`** (From `Entity` to `Entity`):
  * `weight` (DOUBLE): Co-occurrence weight (decayed by token distance).
  * `distance` (INT64): Average token distance between the two entities.
  * `snippet` (STRING): Text snippet enclosing the co-occurrence window.
  * `source_offset` (INT64): Character offset of source entity.
  * `target_offset` (INT64): Character offset of target entity.
  * `file_id` (STRING): ID of the file where the co-occurrence was recorded.

---

## 4. Data Ingestion Pipeline Schema

The diagram below details the asynchronous ingestion lifecycle of a document, tracking its path from the user interface through the scheduling queue, the text extraction/OCR parsing engines, the NLP named entity recognition parser, and finally into the persistent storage engines.

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': { 'textColor': '#ffffff', 'edgeLabelBackground': '#1e293b' }}}%%
graph TD
    subgraph "Client UI (Next.js Renderer)"
        Upload["1. User Uploads Document<br>(PDF, Word, Image, EML...)"]
        Status["7. Polls Ingestion Job Status<br>& Renders Cytoscape.js Graph"]
    end

    subgraph "Web App Service (Next.js Backend)"
        APIRoute["2. API Upload Route<br>(apps/web/app/api/upload)"]
        SQLite_Pending[("3. SQLite (Prisma)<br>File status set to PENDING")]
        BullMQ_Queue["4. BullMQ Producer<br>(Enqueue file parsing job)"]
        BullMQ_Worker["5. BullMQ Worker<br>(Background consumer thread)"]
    end

    subgraph "Job Queue Broker (Redis)"
        Redis_Broker[("Redis Server<br>(Task caching/job state)")]
    end

    subgraph "NLP & Graph Service (FastAPI / PyInstaller)"
        FastAPI_Extract["6. POST /extract Endpoint<br>(apps/nlp-service/main.py)"]
        Dispatcher{"MIME Dispatcher<br>(dispatcher.py)"}
        
        Parser_Office["Office Extractor<br>(python-docx, openpyxl, pptx)"]
        Parser_PDF["PDF Extractor<br>(pypdf reader)"]
        Parser_Email["Email Parser<br>(email_parser.py)"]
        Parser_OCR["OCR Engine<br>(Tesseract via pytesseract)"]

        spaCy_NER["spaCy NER Pipeline<br>(en_core_web_lg, fr_core_news_lg...)"]
        CoOccur["Co-occurrence Calculator<br>(Token sentence sliding window)"]
        
        Kuzu_Write[("KuzuDB (Graph database)<br>Writes Node & Edge tables")]
        SQLite_Write[("SQLite (via Prisma callback)<br>Writes occurrences & updates status")]
    end

    Upload -->|POST multipart/form-data| APIRoute
    APIRoute --> SQLite_Pending
    APIRoute -->|Add job payload| BullMQ_Queue
    BullMQ_Queue -->|Enqueues task| Redis_Broker
    Redis_Broker -->|Pushes job to consumer| BullMQ_Worker
    
    BullMQ_Worker -->|Trigger POST /extract request| FastAPI_Extract
    FastAPI_Extract --> Dispatcher
    
    Dispatcher -->|.docx, .xlsx, .pptx| Parser_Office
    Dispatcher -->|.pdf| Parser_PDF
    Dispatcher -->|.eml| Parser_Email
    Dispatcher -->|Scanned PNG, JPG, PDF| Parser_OCR

    Parser_Office -->|Raw Text string| spaCy_NER
    Parser_PDF -->|Raw Text string| spaCy_NER
    Parser_Email -->|Raw Text string| spaCy_NER
    Parser_OCR -->|Raw Text string| spaCy_NER

    spaCy_NER -->|Extracted entities| CoOccur
    CoOccur -->|"Cypher transactions (db/writers.py)"| Kuzu_Write
    CoOccur -->|Update File status to PROCESSED| SQLite_Write
    
    SQLite_Write -.->|Job completes / dev.db updated| Status

    style Upload fill:#1e293b,stroke:#475569,stroke-width:1px,color:#fff
    style Status fill:#1e293b,stroke:#475569,stroke-width:1px,color:#fff
    style APIRoute fill:#1e293b,stroke:#475569,stroke-width:1px,color:#fff
    style SQLite_Pending fill:#1e293b,stroke:#475569,stroke-width:1px,color:#fff
    style BullMQ_Queue fill:#1e293b,stroke:#475569,stroke-width:1px,color:#fff
    style BullMQ_Worker fill:#1e293b,stroke:#475569,stroke-width:1px,color:#fff
    style Redis_Broker fill:#1e293b,stroke:#475569,stroke-width:1px,color:#fff
    style FastAPI_Extract fill:#1e293b,stroke:#475569,stroke-width:1px,color:#fff
    style Dispatcher fill:#1e293b,stroke:#475569,stroke-width:1px,color:#fff
    style Parser_Office fill:#1e293b,stroke:#475569,stroke-width:1px,color:#fff
    style Parser_PDF fill:#1e293b,stroke:#475569,stroke-width:1px,color:#fff
    style Parser_Email fill:#1e293b,stroke:#475569,stroke-width:1px,color:#fff
    style Parser_OCR fill:#1e293b,stroke:#475569,stroke-width:1px,color:#fff
    style spaCy_NER fill:#1e293b,stroke:#475569,stroke-width:1px,color:#fff
    style CoOccur fill:#1e293b,stroke:#475569,stroke-width:1px,color:#fff
    style Kuzu_Write fill:#1e293b,stroke:#475569,stroke-width:1px,color:#fff
    style SQLite_Write fill:#1e293b,stroke:#475569,stroke-width:1px,color:#fff
```

### 4.1 Ingestion Phase Details
1. **File Upload & Relational Logging**: Next.js receives files at the upload route, writes them locally to `/uploads`, and saves a file catalog entry inside SQLite with the status `PENDING`.
2. **Queueing (BullMQ & Redis)**: Next.js enqueues a job payload containing the file UUID using **BullMQ**. The job is pushed to the local **Redis** instance acting as a robust queue broker.
3. **Job Worker Processing**: The BullMQ worker thread fetches the job and issues an HTTP POST request invoking the FastAPI `/extract` endpoint.

### 4.2 Extraction & Analysis Phase Details
1. **MIME Dispatching**: The FastAPI routing layer intercepts the file path and calls the `dispatcher.py` service. Based on the MIME type, the file is routed to:
   * **Office Extractor**: uses standard python libraries to read `.docx`, `.xlsx`, and `.pptx` files.
   * **PDF Extractor**: parses standard text-based PDF documents.
   * **Email Parser**: processes `.eml` files, extracting headers, body content, and attachments.
   * **OCR Engine**: uses **Tesseract** to parse scanned images and image-based PDFs.
2. **Named Entity Extraction**: The raw text output is run through a **spaCy** large language model pipeline tailored to the detected document language (`en_core_web_lg`, `fr_core_news_lg`, or `ru_core_news_lg`). It extracts entity classifications (persons, places, dates, etc.).
3. **Co-occurrence Analysis**: Neighboring entities are evaluated using a sentence-bounded sliding token window. Proximity weightings and snippets are calculated for graph-edge constructions.

### 4.3 Database Synchronization & Rendering
1. **Graph DB Insertion**: Nodes representing `Entity` and `FileRef` and edges representing `OCCURS_IN` and `CO_OCCURS` are added to **KuzuDB** using parameterized Cypher statements.
2. **Relational Synchronization**: In parallel, occurrence counts and text neighborhoods are saved to SQLite via a callback, and the file status is marked as `PROCESSED`.
3. **UI Update**: Next.js UI queries the updated graph and renders the interactive network using **Cytoscape.js**.
