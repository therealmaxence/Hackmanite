# 6. Weak Signals Discovery

In intelligence analysis, the most obvious or highly connected nodes (hubs) are not always the most interesting. Often, the early warning indicators, critical intermediaries, or highly specific topics are hidden. Hackmanite computes three distinct **Weak Signals** to highlight these hidden indicators.

[Back to Home Index](Home.md)

---

## 1. Rare Bridges (Structural Brokers)

**Rare Bridges** are entities that do not appear frequently in your documents, but mathematically act as critical connectors between different, otherwise isolated communities or groups of nodes in the graph.

### The Formula
\[\text{Score} = \frac{\text{Betweenness Centrality}}{\text{Total Occurrences} + 1}\]

* **Betweenness Centrality**: Measures how often a node lies on the shortest path between all other pairs of nodes in the network.
* **Total Occurrences**: The total number of times the entity appears across all documents.
* **Why it matters**: A high score highlights brokers or "middlemen" who connect separate networks or topics, while filtering out high-visibility hubs (like a generic organization name that appears everywhere).

---

## 2. Niche Topics (Localized Relevance)

**Niche Topics** are highly specific topics or entities that appear in a very small subset of your documents (at most 2 files), but are of extreme significance within those specific documents.

### The Formula
\[\text{Score} = \max(\text{TF-IDF in local occurrences})\]

* **TF-IDF (Term Frequency-Inverse Document Frequency)**: Evaluates how unique a word is to a particular document. A word that appears in almost every document will have a TF-IDF close to 0, while a word that appears heavily in only one document will have a high TF-IDF.
* **Why it matters**: Niche Topics isolate highly concentrated local signals. These represent specific, localized reports or technical details that have not spread across the rest of the corpus.

---

## 3. Spiking Signals (Temporal Bursts)

**Spiking Signals** are entities that show a sudden, isolated burst of occurrences over a short period of time, indicating a sudden event, campaign, or discussion.

### The Formula
\[\text{Score} = \text{Peak Window TF-IDF} \times \text{Concentration Ratio}\]

* **Sliding Window Analysis**: The application splits the entire session timeline into a sliding window of **20%** of the total duration (moving in steps of **10%**).
* **Concentration Requirement**: To qualify as a spike, an entity must have **at least 60%** of its total occurrences fall within that single 20% window.
* **Why it matters**: Highlights emerging trends, temporal operational sequences, or short-lived events that would otherwise get lost in a static, non-temporal graph view.

---

## Visual Highlights on the Graph

When you navigate to the **Weak Signals** dashboard or enable the Weak Signals overlay on the Graph Explorer:
* Nodes identified as Weak Signals are rendered with a **dashed border**.
* They emit a pulsing **neon purple shadow and glow**.
* This visual signature lets you quickly spot hidden brokers or emerging topics at a single glance when exploring large graphs.
