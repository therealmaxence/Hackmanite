# Hackmanite — User Feature Wiki

Welcome to the **Hackmanite (EntityGraph Explorer)** Feature Wiki! 

This wiki is designed to help you understand all the capabilities of Hackmanite, learn how to navigate its interface, customize analysis workflows using pipelines, and perform advanced investigation of named entity networks.

---

## Table of Contents

Explore specific modules and features of the application:

1. **[Getting Started](1_Getting_Started.md)**
   * Installation methods, first-time setup, the Ingestion Dropzone, supported formats, and OCR configuration.
2. **[Session Management](2_Session_Management.md)**
   * Creating and switching sessions, database storage, and exporting/importing snapshots (JSON, GraphML, Obsidian Vault).
3. **[Interactive Graph Explorer](3_Interactive_Graph_Explorer.md)**
   * Interactive network canvas, layout customization, progressive rendering, filter sliders, and node legends.
4. **[Co-occurrence Analysis](4_Co_occurrence_Analysis.md)**
   * Multi-node selection, overlapping file lists, matching text snippets, and visual context highlighting.
5. **[Email Dashboard](5_Email_Dashboard.md)**
   * Browsing email records, filtering by header fields (From, To, Date), and locating source documents.
6. **[Weak Signals Discovery](6_Weak_Signals_Discovery.md)**
   * In-depth look at mathematical indicators: Rare Bridges, Niche Topics, and Spiking Signals, and their visual styling.
7. **[Pipeline Builder](7_Pipeline_Builder.md)**
   * Building reusable graph data workflows: node editor palette, canvas actions, custom configuration, and execution logs.
8. **[AI Intelligence Reports](8_AI_Intelligence_Reports.md)**
   * Generating structured briefings, setting up AI models (Mistral Cloud vs. Ollama), selecting context, and exporting options.
9. **[Distributed Kafka Pipeline](9_Distributed_Kafka_Pipeline.md)**
   * Scaling execution using Kafka event streams, coordinator/worker patterns, and Kubernetes deployment.

---

## Core Concepts

At its heart, Hackmanite extracts and visualizes relationships between **named entities** (such as People, Organizations, Locations, Dates, Phone Numbers, and Emails) across a collection of documents.

* **Nodes (Entities)**: Extracted unique real-world objects or concepts.
* **Edges (Co-occurrences)**: Topological links indicating that two entities appeared near each other within the same sentence or paragraph context.
* **Sessions**: Self-contained workspaces that group documents, graphs, and settings together so you can run separate investigations side-by-side.
