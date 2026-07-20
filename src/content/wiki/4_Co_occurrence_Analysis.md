# 4. Co-occurrence Analysis

Understanding **why** and **how** two or more entities are related is the core of intelligence analysis. Hackmanite provides a dedicated **Co-occurrence Panel** to display direct textual evidence connecting your nodes.

---

## How Co-occurrence is Computed

When a document is ingested, Hackmanite splits text into sliding contextual windows (sentences or paragraphs):
* If two entities appear in the same window, a **co-occurrence** edge is registered.
* Link weight decays based on token distance.
* The physical sentence snippet containing both entities is stored in the database.

---

## Analyzing Connections Step-by-Step

1. **Select Nodes**: Hold `Ctrl` (or `Cmd` on Mac) and click target entities on the canvas.
2. **Review Side Panel**: The **Co-occurrence Panel** slides open automatically.
3. **Compare Tabs**:
   * **File Co-occurrence**: Lists all common source documents.
   * **Text Co-occurrence**: Lists exact paragraphs where entities co-occur with highlighted text.
