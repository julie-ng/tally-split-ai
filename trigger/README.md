# Trigger.dev Tasks

This directory contains [Trigger.dev](https://trigger.dev) task definitions for the receipt analysis pipeline.

> [!TIP]
> Trigger CLI can only trigger orchestrator. Use our manual HTTP endpoints to test individual triggers, e.g. only OCR analysis.

## Tasks

| Task | ID | Description |
|:--|:--|:--|
| `receipt-workflow.ts` | `receipt-workflow` | Orchestrator — runs OCR, annotations, and split creation in sequence |
| `analyze-ocr.ts` | `analyze-ocr` | Calls Azure Document Intelligence for receipt OCR |
| `analyze-annotations.ts` | `analyze-annotations` | Calls GPT-4o to detect handwritten annotations |
| `create-split.ts` | `create-split` | Creates an expense split from the receipt total |

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
