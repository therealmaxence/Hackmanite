# 9. Project Architecture & System Design

Hackmanite implements a **decoupled, multi-service standalone desktop architecture** inside an Electron shell wrapper.

---

## Service Layer Overview

* **Electron Main Shell**: Orchestrates startup, PID monitoring, and clean subprocess termination.
* **Next.js Web Server (Port 3000)**: React UI frontend, Prisma client, and API router.
* **FastAPI NLP Engine (Port 8000)**: spaCy 3.7 entity extraction, Tesseract OCR, and Kùzu Python graph database manager.
* **SQLite (`dev.db`)**: Tabular metadata, sessions, files, emails, and pipelines.
* **KuzuDB (`kuzu.db`)**: Embedded graph database for ultra-fast Cypher entity/co-occurrence queries.

---

## Dual Database Architecture

### SQLite Relational Schema
* `sessions`, `files`, `entities`, `occurrences`, `entity_neighborhoods`, `emails`, `pipelines`, `pipeline_runs`.

### KuzuDB Graph Schema
* Node tables: `Entity` (`id`, `canonical`, `type`, `metadata`), `FileRef` (`id`).
* Relationship tables: `OCCURS_IN` (`count`, `tfidf`, `excerpts`), `CO_OCCURS` (`weight`, `distance`, `snippet`).
