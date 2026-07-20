# 1. Getting Started with Hackmanite

Hackmanite (EntityGraph Explorer) is designed to run locally on your system, processing files and keeping all data fully private. This guide covers how to launch the application, ingest files, and set up Optical Character Recognition (OCR) for scanned documents.

---

## Running the Application

Depending on how you received Hackmanite, you can launch it in one of the following ways:

### 1. Portable ZIP (Recommended for Users)
* Use **7-Zip** to extract the `Hackmanite-1.0.0-win.zip` package (Windows' built-in extractor can silently corrupt files in large ZIP archives).
* Double-click **`Hackmanite.exe`** in the extracted directory. All required services (FastAPI NLP service, Next.js web server, and SQLite database) will boot automatically.

### 2. Docker Mode (Development)
* With Docker Desktop running, execute the following command at the repository root:
  ```powershell
  docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
  ```
* Open your browser and navigate to `http://localhost:3000`.

---

## Document Ingestion Dropzone

When you launch Hackmanite, you will land on the **Home Dashboard**. 

### 1. Uploading Files
To begin extracting entities, simply drag and drop your files or folders onto the central **Dropzone** area, or click the dropzone to browse your system files.

* **Supported Formats**: 
  * Documents: PDF, Word (`.docx`), PowerPoint (`.pptx`), Excel (`.xlsx`), Text (`.txt`, `.rtf`, `.md`), HTML (`.html`).
  * Emails: Email formats (`.eml`, `.pst`).
  * Images: `.png`, `.jpg`, `.jpeg`, `.tiff`, `.bmp`.

### 2. The Extraction Queue
Once files are dropped, they are added to the queue in the right-hand panel:
* **Asynchronous Processing**: Files are processed in the background one by one with status indicators: `Processing`, `Success`, or `Failed`.
* **Progress Tracking**: The top bar displays total files, completed files, and any errors encountered.
* **Explore Graph**: Once at least one file is successfully processed, the **Explore Graph** button will activate.

---

## Optical Character Recognition (OCR)

To extract entities from scanned documents, image-based PDFs, or standalone images, Hackmanite uses **Tesseract OCR**.

> [!IMPORTANT]
> To enable OCR, install Tesseract OCR on your machine. Without it, image files will not yield text content, and scanned PDFs will appear blank.

### Installing Tesseract OCR:
* **Windows**: Run `winget install UB-Mannheim.TesseractOCR` in PowerShell (Admin).
* **macOS**: Run `brew install tesseract`.
* **Linux**: Run `sudo apt install tesseract-ocr`.
