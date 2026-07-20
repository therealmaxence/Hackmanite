# 8. AI Intelligence Reports (LLM Integration)

Hackmanite integrates with LLMs (Mistral AI Cloud & local Ollama endpoints) to generate structured analytical briefings from session entity graphs.

---

## Connection Setup

* **Mistral AI (Cloud)**: Enter API key (stored in secure client-side `localStorage`) and select `mistral-large` or `open-mixtral`.
* **Custom (Ollama / Local OpenAI Compatible)**: Base URL (e.g. `http://localhost:11434/v1`) and local model tag (`llama3`, `mistral`, `phi3`).

---

## Report Perspectives

* **Executive Summary**: Overview of dataset intelligence.
* **Threat Actor Focus**: Groups, targets, emails, IPs.
* **Network Clusters**: Graph co-occurrences and bridge connectors.
* **Temporal Timeline**: Operational chronologies and peak hours.
