# 1. Getting Started with Hackmanite

Hackmanite (EntityGraph Explorer) is designed to run locally on your system, processing files and keeping all data fully private. This guide covers how to launch the application, ingest files, and set up Optical Character Recognition (OCR) for scanned documents.

[Back to Home Index](Home.md)

---

## Running the Application

Depending on how you received Hackmanite, you can launch it in one of three ways:

1. **Portable ZIP (Recommended for Users)**:
   * Use **7-Zip** to extract the `Hackmanite-1.0.0-win.zip` package (Windows' built-in extractor can silently corrupt files in large ZIP archives).
   * Double-click **`Hackmanite.exe`** in the extracted directory. All required services (FastAPI NLP service, Next.js web server, and SQLite database) will boot automatically.
2. **Docker Mode (Development)**:
   * With Docker Desktop running, execute the following command at the repository root:
     ```powershell
     docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
     ```
   * Open your browser and navigate to `http://localhost:3000`.
3. **Local Dev Environment**:
   * Refer to the root `README.md` for steps on booting the Next.js frontend, FastAPI NLP service, and Electron shell manually.

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
* **Asynchronous Processing**: Files are processed in the background one by one. You will see status indicators: `Processing`, `Success`, or `Failed`.
* **Progress Tracking**: The top bar displays the total files, files completed, and any errors encountered.
* **Explore Graph**: Once at least one file is successfully processed, the **Explore Graph** button will activate, allowing you to view your network.

### 3. Handling Extraction Failures
If a file fails to process (e.g., due to file corruption, unsupported encoding, or a network timeout):
* The status will change to red with a description of the error.
* A **"Retry Failed"** button will appear in the UI. Click it to re-trigger failed extractions.

---

## Optical Character Recognition (OCR)

To extract entities from scanned documents, image-based PDFs, or standalone images, Hackmanite uses **Tesseract OCR**.

> [!IMPORTANT]
> To enable OCR, you must install Tesseract OCR on your machine. Without it, image files will not yield any text content, and scanned PDFs will appear blank.

### Installing Tesseract OCR:
* **Windows**: 
  * Run the following command in PowerShell (Admin):
    ```powershell
    winget install UB-Mannheim.TesseractOCR
    ```
  * Or download the installer directly from the [Official Tesseract Installer Repository](https://github.com/UB-Mannheim/tesseract/wiki).
* **macOS**:
  * Run: `brew install tesseract`
* **Linux**:
  * Run: `sudo apt install tesseract-ocr`

### Auto-Detection:
Hackmanite will automatically detect Tesseract if installed at its standard system location. Once detected, any scanned or image documents dropped into the application will be OCR-scanned before applying NLP entity recognition.
