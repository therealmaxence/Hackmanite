# Hackmanite NLP Service

This is the FastAPI backend service that powers **Hackmanite**. It provides Named Entity Recognition (NER), OCR processing, document parsing, and interacts with KuzuDB (an embedded graph database).

## Submodules & Capabilities

1. **API Routers (`routers/`)**:
   - `extract`: Controls file extraction jobs, dispatching tasks to text extraction and regex extractors.
   - `graph`: Handles reading and writing entities and relations to KuzuDB.
   - `tesseract`: Endpoint for raw OCR requests.

2. **Parsing & Ingestion Services (`services/`)**:
   - `dispatcher`: Orchestrates multi-tier ingestion (metadata -> text -> OCR).
   - `entity_extraction`: Runs spaCy models to identify names, locations, organizations, dates, etc.
   - `ocr`: Wraps Tesseract for image-based text recovery.
   - `email_parser`: Extracts structured email headers, dates, and thread parent/child links from `.eml` files.

## Running Locally

To run the documentation dev server locally:
```bash
pip install -r requirements-dev.txt
mkdocs serve
```
And to build the static production site:
```bash
mkdocs build
```
This will generate a static folder `site/` at the root of `nlp-service`.
