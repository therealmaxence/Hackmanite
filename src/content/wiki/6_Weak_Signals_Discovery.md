# 6. Weak Signals Discovery

In intelligence analysis, high-density hubs are not always the most critical nodes. Hackmanite computes three mathematical **Weak Signals** to highlight hidden indicators.

---

## 1. Rare Bridges (Structural Brokers)

Nodes with low overall frequency that act as critical topological connectors between isolated sub-networks.

$$\text{Score} = \frac{\text{Betweenness Centrality}}{\text{Total Occurrences} + 1}$$

---

## 2. Niche Topics (Localized Relevance)

Entities highly specific to a small subset of documents (max 2 files) with high local TF-IDF salience.

$$\text{Score} = \max(\text{TF-IDF in local occurrences})$$

---

## 3. Spiking Signals (Temporal Bursts)

Entities experiencing a sudden burst of frequency in a short chronological timeframe.

$$\text{Score} = \text{Peak Window TF-IDF} \times \text{Concentration Ratio}$$

* Analyzed using a sliding window of **20%** of session timeline.
* Requires at least **60%** of occurrences within the peak window.
