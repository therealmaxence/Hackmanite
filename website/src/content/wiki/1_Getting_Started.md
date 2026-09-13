# 1. Getting Started with Hackmanite

Hackmanite (EntityGraph Explorer) is designed to run locally on your system, processing files and keeping all data fully private. This guide covers how to launch the application, ingest files, and set up Optical Character Recognition (OCR) for scanned documents.

[Back to Home Index](Home.md)

---

## Getting and Running the Application

Hackmanite provides pre-compiled standalone desktop bundles for **Windows** and **Linux**, as well as containerized Docker and local source execution.

### 1. Download Pre-Built Desktop Binaries (Recommended)

You can download the latest production binaries directly from:
* **Official Website**: [https://therealmaxence.github.io/Hackmanite/](https://therealmaxence.github.io/Hackmanite/) (Click the **Download** button in the header or hero banner)
* **GitHub Releases**: [https://github.com/therealmaxence/Hackmanite/releases/latest](https://github.com/therealmaxence/Hackmanite/releases/latest)

#### Windows Packages
* **Installer Setup (`.exe`)**: Recommended for most users. Run the installer wizard for automated start-menu shortcuts and desktop integration.
* **Portable ZIP (`.zip`)**: Zero-installation archive. Extract using **7-Zip** (Windows' default extractor may truncate large models) and double-click `Hackmanite.exe`.

#### Linux Packages (Ubuntu / Debian / Universal)
* **Debian Package (`.deb`)**:
  ```bash
  sudo apt update
  sudo apt install ./hackmanite-desktop_*_amd64.deb
  # Or via dpkg:
  sudo dpkg -i ./hackmanite-desktop_*_amd64.deb
  ```
* **Standalone AppImage (`.AppImage`)**:
  ```bash
  chmod +x Hackmanite-*.AppImage
  ./Hackmanite-*.AppImage
  ```

All desktop bundles include the Electron shell, Next.js web application, embedded SQLite and KuzuDB database engines, and pre-packaged spaCy NLP models for English, French, and Russian. No external runtime (Python, Node.js, Docker) is required.

---

### 2. Automated Continuous Delivery (CI/CD Pipeline)

Hackmanite uses a GitHub Actions automated release pipeline (`.github/workflows/build-release.yml`):
* **Code Change Detection**: On every push to `master`, the workflow inspects modified files. If changes occur within `apps/**` or core package configurations, the release pipeline triggers automatically. Pushes that only modify documentation, wiki, or website content do not trigger expensive compilation jobs.
* **Automatic Version Bumping**: Increments the application version number automatically across `package.json` manifests and tags the commit (`vX.Y.Z`).
* **Multi-Platform Matrix Build**: Spawns concurrent build runners on `windows-latest` (producing `.exe` installer and `.zip` portable) and `ubuntu-latest` (producing `.deb` package and `.AppImage`).
* **Release Publishing & Website Synchronization**: Automatically creates a GitHub Release with SHA-256 verification checksums, updates the release manifest, and redeploys the live documentation website on GitHub Pages.

---

### 3. Docker Mode (Development)
* With Docker Desktop running, execute the following command at the repository root:
  ```powershell
  docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
  ```
* Open your browser and navigate to `http://localhost:3000`.

### 4. Launching from Local Source
If you cloned the source code from GitHub:
* Running the app in local development mode requires Node.js ≥ 18 and Python ≥ 3.10.
* Please refer to the main repository [README.md](../README.md) for first-time environment configuration (`.env`) and service startup commands.

### 5. Manual Binary Compilation
If you wish to compile the application binaries yourself:
* Refer to the main repository [README.md](../README.md) under the "Building the Portable ZIP" or "Building for Linux/Ubuntu" sections for step-by-step native compilation.

---

## Interactive Guided Onboarding

When you first launch Hackmanite (on both desktop and web), an interactive step-by-step onboarding tour automatically launches to walk you through the interface:
* **Welcome Overview**: Introduces Hackmanite's private, local entity-relationship graph concept.
* **Document Dropzone**: Highlights supported file types and OCR extraction.
* **Extraction Queue**: Explains asynchronous pipeline processing and retrying failed files.
* **Navigation & Shortcuts**: Reviews analytical views and keyboard shortcuts (`Alt + <Key>`).
* **Session Status**: Shows active database session metrics and queue status.

> [!TIP]
> You can replay the guided tour at any time by clicking the **"Guided Tour"** button in the Workspace menu, from the Home screen, or via the interactive tour banner in the Help Center. The tour is available in both English and French.

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

---

## Navigation Keyboard Shortcuts

To navigate rapidly between views without mouse clicks, Hackmanite features global `Alt`-based keyboard shortcuts. These shortcuts work across the application (and automatically pause when actively typing inside form inputs or textareas):

| Shortcut | Destination | Description |
| :--- | :--- | :--- |
| **`Alt + U`** | **Upload / Home** (`/`) | Return to the file ingestion dropzone and queue |
| **`Alt + G`** | **Interactive Graph** (`/graph`) | Open the interactive entity-relationship graph canvas |
| **`Alt + E`** | **Email Dashboard** (`/emails`) | Browse and filter extracted email archives and headers |
| **`Alt + S`** | **Statistics Dashboard** (`/stats`) | Inspect entity distributions, category counts, and centrality |
| **`Alt + W`** | **Weak Signals Discovery** (`/weak-signals`) | Discover rare bridges, niche topics, and spiking signals |
| **`Alt + P`** | **Pipeline Builder** (`/pipelines`) | Create and run automated graph analysis pipelines |
| **`Alt + R`** | **AI Intelligence Report** (`/ai-report`) | Generate structured LLM summaries and entity dossiers |
| **`Alt + O`** | **Session Management** (`/session`) | Switch between active sessions or restore backups |
| **`Alt + ,`** | **Application Settings** (`/settings`) | Manage models, appearance, language, and system settings |
| **`Alt + H`** | **Help Center** (`/help`) | Access user guides, algorithms, and documentation |

> [!TIP]
> Shortcut badges are also displayed directly inside the top navigation menu dropdowns for quick reference.
