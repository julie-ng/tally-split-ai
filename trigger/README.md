# Trigger.dev Tasks

This directory contains [Trigger.dev](https://trigger.dev) task definitions for the receipt analysis pipeline.

> [!TIP]
> Trigger CLI can only trigger orchestrator. Use our manual HTTP endpoints to test individual triggers, e.g. only OCR analysis.

## Pipeline shape

One orchestrator (`receipt-workflow`) fans out to five worker tasks in a **fixed sequence**. The control flow is plain deterministic JavaScript — a DAG of `triggerAndWait` calls. No LLM decides what runs next, nothing loops, no model calls tools: this is an **orchestrated LLM pipeline, not an agent**. The "intelligence" is three discrete, single-shot LLM calls with structured outputs, each doing one narrow job:

- `analyze-annotations` — perception (reads the photo, detects handwriting)
- `normalize-receipt` — cleanup/enrichment (fixes OCR date/year, generates a title)
- `adjust-expense` — allocation (maps handwriting → person, splits the total asymmetrically)

Prompts for these live in [`instructions/`](./instructions). The other two workers are deterministic (Azure DI extraction; pure split math).

## Tasks

| Task | ID | Kind | Fatal? | Description |
|:--|:--|:--|:--|:--|
| `receipt-workflow.js` | `receipt-workflow` | orchestrator | — | Runs the five workers in sequence; finalizes `workflow_runs` status |
| `analyze-ocr.js` | `analyze-ocr` | deterministic | **yes** | Azure Document Intelligence receipt OCR |
| `analyze-annotations.js` | `analyze-annotations` | AI (GPT-4o) | no | Detects handwritten annotations (initials, circles, strikethroughs) |
| `normalize-receipt.js` | `normalize-receipt` | AI (GPT-4o-mini) | no | Normalizes date/year, generates title, flags human-named filenames |
| `create-expense.js` | `create-expense` | deterministic | no | Creates an expense from the receipt total (defaults to 50/50) |
| `adjust-expense.js` | `adjust-expense` | AI (GPT-4o-mini) | no | Asymmetric split from annotations/instructions — **gated on `households.llmConsent`** |
| `delete-blobs.js` | `delete-blobs` | deterministic | — | Cleans up Azure blobs when an expense/receipt is deleted (not part of the analysis pipeline) |

**Failure handling:** only OCR is fatal. If any AI step fails, the orchestrator records it per-step in `workflow_runs.errors` and finishes the run as `PARTIAL` — the user still gets a receipt and an editable 50/50 expense. `adjust-expense` is additionally *skipped* (a distinct status, not failed) when the household hasn't consented to LLM analysis, since it's the only step that sends member names to the model.

## Running the dev worker

The Trigger.dev dev CLI connects your local machine to the Trigger.dev cloud as a worker — tasks are orchestrated in the cloud but executed locally. This dev tunnel must be running alongside the Nuxt dev server for tasks to execute:

```bash
npm run trigger:dev
```

## Running tasks manually

### Full workflow (orchestrator)

The orchestrator can be triggered via the API:

```bash
curl -X POST http://localhost:3000/api/workflows/{uploadId}
```

This creates a `workflow_runs` record and triggers the full pipeline.

### Individual tasks

Individual tasks require a `workflowRunId`, which is created by the API endpoints. They cannot be triggered directly via CLI because each task needs an existing `workflow_runs` record to update step statuses.

Use these thin API endpoints instead:

```bash
# OCR only
POST /api/analysis/ocr/{uploadId}

# Annotations only
POST /api/analysis/annotations/{uploadId}
```

> [!IMPORTANT]
> These endpoints are for dev/manual testing. They create a workflow run record and trigger a single task. Not exposed in production.
