# Status Enums

> [!IMPORTANT]
> **TODO — Known inconsistencies:** These enums evolved organically from different phases of the project. Some naming overlaps exist, e.g. "pending" vs "queued", "completed" vs "analyzed". 
> 
> Not critical to refactor for the POC, but worth harmonizing if the status model gets more complex.

## How enums are exported

Each file exports:
- **Object** (e.g. `WORKFLOW_STATUS`) — keyed access for use in code (`WORKFLOW_STATUS.PROCESSING`)
- **Array** (e.g. `WORKFLOW_STATUSES`) — derived via `Object.values()`, for Drizzle `text({ enum })` columns and Zod `z.enum()`

---

## Receipt Analysis Status

- **Table:** `receipts.analysis_status`
- **File:** `receipt-analysis-status.js`

Tracks whether a receipt record has been analyzed by Azure Document Intelligence. This is a **receipt-level** concern — a receipt is created during OCR analysis and marked `analyzed` once extraction succeeds. 

> [!NOTE]
> Status is used as UI logic to show or hide the "Analyze" button.

Granular progress tracking (queued, in-progress) lives in `workflow_runs`, not here.

| Key | Value | Set by |
|:--|:--|:--|
| UNANALYZED | `unanalyzed` | Default for new receipts |
| ANALYZED | `analyzed` | `analyze-ocr` task on success |

---

## Upload Analysis Status

- **Table:** `uploads.analysis_status`
- **File:** `upload-analysis-status.js`

> [!NOTE]
> This is an **upload-level** convenience field updated by the workflow orchestrator so the frontend can show status without querying `workflow_runs`.

Tracks the overall analysis state of an uploaded file. Both this and Receipt Analysis Status relate to the same uploaded file, but at different levels:

- **Upload** = "has the workflow finished processing this file?"
- **Receipt** = "did we successfully extract structured data from this file?"

| Key | Value | Set by |
|:--|:--|:--|
| PENDING | `pending` | Default |
| QUEUED | `queued` | Workflow endpoint (when trigger fires) |
| PROCESSING | `processing` | — (implied by workflow running) |
| COMPLETED | `completed` | Orchestrator (when workflow finishes) |
| FAILED | `failed` | — (not yet implemented) |

---

## Workflow Status (orchestrator)

- **Table:** `workflow_runs.status`
- **File:** `workflow-status.js`

Tracks the overall state of a Trigger.dev workflow run. These are **our own enums** — not mirroring Trigger.dev's internal statuses. Trigger.dev has its own run states, but we define and manage these ourselves based on task outcomes.

| Key | Value | Set by |
|:--|:--|:--|
| QUEUED | `queued` | Default on insert |
| PROCESSING | `processing` | Orchestrator (`receipt-workflow`) at start |
| COMPLETED | `completed` | Orchestrator after all steps finish |
| FAILED | `failed` | Orchestrator if OCR fails (fatal) |

---

## Workflow Step Status

- **Table:** `workflow_runs.ocr_status`, `annotations_status`, `split_status`
- **File:** `workflow-status.js`

Tracks individual steps within a workflow run. Also **our own enums**, not Trigger.dev's. Each step task updates its own column.

| Key | Value | Set by |
|:--|:--|:--|
| PENDING | `pending` | Default — step hasn't started yet |
| PROCESSING | `processing` | Each task at start (e.g. `analyze-ocr`) |
| COMPLETED | `completed` | Each task on success |
| FAILED | `failed` | — (individual step failure not yet tracked here) |
