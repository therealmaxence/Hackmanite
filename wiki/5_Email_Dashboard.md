# 5. Emails Dashboard

Hackmanite contains specialized parsers and UI views for email archives. When you ingest email files, the application extracts both the graph entities (from the body) and the structured header metadata (to build communication networks).

[Back to Home Index](Home.md)

---

## Ingesting Email Files

You can drop two main types of email files into the dropzone:
1. **EML Files (`.eml`)**: Individual email messages.
2. **PST Files (`.pst`)**: Outlook personal folders containing multiple emails (extracted asynchronously into separate records).

---

## The Dedicated Email Interface

Click **Emails** in the header to open the specialized email table interface. This view helps you filter, search, and map email communications:

### 1. Metadata Columns
The table displays structured headers parsed directly from the files:
* **From / Sender**: The email address of the sender.
* **To / Recipients**: Primary recipients (handles multiple addresses).
* **CC / BCC**: Carbon copy addresses.
* **Subject**: The subject line.
* **Date**: The transmission timestamp.
* **Attachments**: Lists the names of files attached to the email.

### 2. Filtering and Searching
You can perform multi-parameter filtering:
* Use the search bar to find specific keywords in the subject or body.
* Filter by sender or recipient domain.
* Sort by Date to establish timelines.

---

## Locating Source Files and Attachments

* Clicking on any email row in the table opens the **Email Details Panel**.
* This panel displays the full HTML or text body of the email, complete with extracted entities highlighted.
* **Source Document Link**: Click the link in the header of the details panel to jump directly to the source file record or view the attachments, which are also processed for entities.
