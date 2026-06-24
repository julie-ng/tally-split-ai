---
name: trigger-dev
description: Trigger.dev task patterns specific to this project — the orchestrator, status/TTL handling, import constraints, and gotchas. Use when creating or modifying tasks in trigger/.
---

# Trigger.dev Tasks

SDK v3 (`@trigger.dev/sdk/v3`) — `task({ id, run })` / `schemaTask({ id, schema, run })`; never v2 `client.defineJob`. Config: `trigger.config.js`. Local: `npx trigger dev`. The basic task/trigger API is in the public docs — copy shape from any existing file in `trigger/`. This skill is the project-specific parts and the traps.

## Gotchas that aren't in the basic docs

- **`tasks.trigger()` enqueues to the Trigger.dev cloud — it is NOT a connection to the worker.** It returns `handle.id` and succeeds **even with no worker running**; the run just sits queued and never executes. A successful enqueue says nothing about whether anything will run it. We persist `handle.id` as `workflowRuns.triggerRunId` so status can be checked later.
- **`triggerAndWait()` returns a Result `{ ok, output, error }`, not the output.** Check `result.ok`, read `result.output`; or `.unwrap()` to throw on error. **Never** wrap `triggerAndWait` in `Promise.all` / `Promise.allSettled` — unsupported.
- **Tasks run outside Nuxt** — no auto-imports (`useDB`, `schema`, `createError`). Import directly from `#server/...`, `#shared/...`, source files. Use `import type` for task refs when triggering from Nuxt API routes (avoids bundling task code).
- **Waits > 5s are checkpointed** and don't burn compute (the basis for the GPT-4o 429 backoff via `wait.for`).

## Detecting "it never ran" — TTL & status

`maxDuration` only caps a **running** task; it does nothing for a run no worker ever dequeues. For that:

- **TTL → `EXPIRED`.** A run not dequeued within its `ttl` auto-expires to status `EXPIRED`, platform-timed — this is the "no worker claimed it" signal, so **don't build a reaper**. Set via per-trigger `{ ttl }`, per-task `ttl`, or config-file default. **Dev default = 10 min; prod has NO default** (set one or a no-worker run queues forever). For callback-token tasks, align `ttl` to the token lifetime — a run whose HMAC token expired can't call back anyway.
- **`runs.retrieve(triggerRunId)`** — pull current status on demand (e.g. on page load).
- **`runs.subscribeToRun(triggerRunId)`** — async-iterator push, Trigger.dev's *own* server-side realtime (independent of our app SSE/Supabase channel).

(See memory `project_no_worker_detection_gap` for how this maps onto the unbuilt worker-unavailable UI.)

## This project's tasks

Files are `.js`; task ID = `const TASK_ID` in each. Triggered via `POST /api/workflows/[uploadId]`.

| Task ID | File | Purpose |
|:--|:--|:--|
| `receipt-workflow` | `trigger/receipt-workflow.js` | Orchestrator — OCR → annotations → normalize → create-expense → adjust-expense |
| `analyze-ocr` | `trigger/analyze-ocr.js` | Azure Document Intelligence OCR |
| `analyze-annotations` | `trigger/analyze-annotations.js` | GPT-4o annotation detection |
| `normalize-receipt` | `trigger/normalize-receipt.js` | GPT-4o receipt normalization |
| `create-expense` | `trigger/create-expense.js` | Creates an expense from the receipt total |
| `adjust-expense` | `trigger/adjust-expense.js` | GPT-4o adjusts the expense split |

Each task carries an action-scoped HMAC callback token (`shared/config/task-permissions.js`); the orchestrator mints per-child tokens via `POST /api/workflows/runs/:runUuid/tokens`. Scope is part of the *signed* payload — see memory `project_hmac_token_design`. (Task IDs were `create-split`/`adjust-split` until the 2026-06-24 rename; old IDs are gone.)
