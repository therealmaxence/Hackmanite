# Hackmanite — DataLake Entity Graph Explorer

> **Version 1.0.0**

Hackmanite can be a desktop or web application built for extracting, exploring, and visualizing **named entities** (persons, organizations, locations, dates, emails, phone numbers, …) from documents. It supports a wide variety of file formats and provides an interactive graph interface to navigate relationships between entities across sessions and much more.

*This project was made in collaboration with [GEODE](https://geode.science/).*

---

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [System Requirements](#system-requirements)
- [First-Time Setup (Development)](#first-time-setup-development)
- [Running the App](#running-the-app)
- [Exporting to Obsidian](#exporting-to-obsidian)
- [Pipeline Builder](#pipeline-builder)
- [Weak Signals Discovery](#weak-signals-discovery)
- [AI Intelligence Report (LLM Integration)](#ai-intelligence-report-llm-integration)
- [Building the Portable ZIP](#building-the-portable-zip)
- [Documentation](#documentation)
- [Versioning](#versioning)
- [License](#license)

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

- **OS**: Windows 10/11 (64-bit), macOS, or Linux
- **RAM**: 8 GB minimum (16 GB recommended for large document sets)
- **Disk Space**: 3 GB for application binaries, spaCy models, and database
