# 8. AI Intelligence Reports (LLM Integration)

Hackmanite integrates with Large Language Models (LLMs) to automatically generate structured analytical briefings based on your session's entities, co-occurrence networks, timeline data, and weak signals.

[Back to Home Index](Home.md)

---

## Connection Setup

You can configure your LLM settings from the **AI Report** configuration column:

1. **Mistral AI (Cloud)**:
   * **Endpoint**: Cloud API.
   * **API Key**: Input your Mistral API key (saved securely in your browser's local client-side `localStorage`).
   * **Model**: Select pre-defined models like `mistral-large` or `open-mixtral`.
2. **Custom (Ollama / Local / OpenAI-compatible)**:
   * **Endpoint**: Specify any OpenAI-compatible base URL (e.g., local Ollama server running at `http://localhost:11434/v1`).
   * **API Key**: If running Ollama locally, you can enter any dummy value or leave it blank.
   * **Model**: Type in the tag of your local model (e.g., `llama3`, `mistral`, `phi3`).

---

## Building Context for the LLM

To keep reports factual and prevent model hallucinations, Hackmanite extracts structural data from the SQLite and KuzuDB databases and wraps it in a strict system prompt:

* **Session Statistics**: File names, date ranges, total entities, and categories.
* **Extraction Sliders**: Adjust limits to prevent context window overflow:
  * **Top Entities Count**: Number of high-frequency entities to include.
  * **Salient TF-IDF Entities**: Number of highly specific entities to include.
  * **Central Bridge Nodes**: Number of Rare Bridges (structural connectors) to include.
* **Weak Signal Selection**: You can check/uncheck specific Rare Bridges, Niche Topics, or Spiking Signals cards. Only checked signals are fed into the LLM context.
* **Analyst Directives**: Add a custom text prompt to guide the model (e.g. "Focus on financial transactions" or "Translate the final summary into French").

---

## Model Focus Options

Choose a specific perspective for the intelligence briefing:

* **Executive Summary**: General intelligence overview of the dataset.
* **Threat Actor Focus**: Focuses on threat groups, targets, emails, organizations, and IP addresses.
* **Network Clusters**: Analyzes graph co-occurrences, bridges, and how different clusters link together.
* **Temporal Timeline**: Focuses on operational chronologies, Peak Activity hours, and event sequences.

---

## Exporting the Briefing

Once the report is generated, the header bar of the briefing panel provides several actions:

* **Copy**: Copies the raw Markdown text to your clipboard.
* **Download MD**: Saves the report as a `.md` markdown file.
* **Print PDF**: Compiles the report into a PDF. The application applies a custom, clean, print-friendly CSS stylesheet that hides UI buttons and formats the report text beautifully for physical printing or saving.
