# 4. Co-occurrence Analysis

Understanding **why** and **how** two or more entities are related is the core of intelligence analysis. Hackmanite provides a dedicated **Co-occurrence Panel** to display direct textual evidence connecting your nodes.

[Back to Home Index](Home.md)

---

## How Co-occurrence is Computed

When a document is ingested, Hackmanite splits the text into sliding contextual windows (sentences or paragraphs). 

* If two entities (e.g. `John Doe` and `ACME Corp`) appear in the same window, a **co-occurrence** is registered.
* The strength (weight) of their link is calculated based on how close they are to each other within the sentence.
* The physical text block containing both entities is saved as a snippet in the SQLite database.

---

## Analyzing Connections Step-by-Step

To analyze the relationship between two or more entities:

1. **Select the Nodes**:
   * Hold the **`Ctrl`** key (Windows/Linux) or **`Cmd`** key (Mac).
   * Click on the target entities on the graph canvas.
2. **Review the Side Panel**:
   * As soon as multiple nodes are selected, the **Co-occurrence Panel** will slide open on the right side of the screen.
3. **Compare Tabs**:
   * **File Co-occurrence**: Displays a list of all documents where the selected entities appear together. This helps you identify common source documents.
   * **Text Co-occurrence**: Lists the exact paragraphs or sentences where the selected entities appear together.

---

## Text Snippets and Highlighting

The **Text Co-occurrence** tab shows the raw textual evidence:
* The snippet lists the file it was extracted from and the timestamp.
* The selected entities are highlighted in different colors directly within the text block so you can quickly scan the context of their relationship.
* This allows you to verify connections immediately without having to open the original source PDF or Word document in another application.
