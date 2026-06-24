---
name: trigger-dev
description: Trigger.dev SDK patterns — task definitions, triggering from backend, orchestrator patterns, result handling. Use when creating or modifying Trigger.dev tasks in trigger/.
---

# Trigger.dev Tasks

**MUST use `@trigger.dev/sdk/v3`, NEVER `client.defineJob` (v2 deprecated)**

## Project Setup

- Config: `trigger.config.ts` at project root
- Tasks live in: `trigger/` directory
- Local dev: `npx trigger dev` (runs tasks locally, coordinates via Trigger.dev cloud)

## Task Definition

```ts
import { task, logger } from "@trigger.dev/sdk/v3"

export const myTask = task({
  id: "my-task",
  maxDuration: 300,
  run: async (payload: { someField: string }) => {
    logger.log("Running task", { payload })
    return { result: "done" }
  },
})
```

## Schema Task (with Zod validation)

```ts
import { schemaTask } from "@trigger.dev/sdk/v3"
import { z } from "zod"

export const validatedTask = schemaTask({
  id: "validated-task",
  schema: z.object({
    name: z.string(),
    email: z.string().email(),
  }),
  run: async (payload) => {
    return { message: `Hello ${payload.name}` }
  },
})
```

## Triggering Tasks

### From API routes (fire-and-forget)

```ts
import { tasks } from "@trigger.dev/sdk/v3"

// Use type-only import to avoid bundling task code into Nuxt
const handle = await tasks.trigger("my-task", { someField: "value" })
// Returns immediately with handle.id
```

> `tasks.trigger()` is an HTTP **enqueue to the Trigger.dev cloud**, not a connection to the worker. It succeeds (returns `handle.id`) even when **no worker is running** — the run just sits queued with no consumer and never executes. A successful enqueue says nothing about whether a worker will dequeue it. Persist `handle.id` (we store it as `workflowRuns.triggerRunId`) so real status can be checked later — see "Run status, TTL & expiry".

### From inside tasks (orchestrator pattern)

```ts
// triggerAndWait returns a Result object, NOT the direct output
const result = await childTask.triggerAndWait({ data: "value" })
if (result.ok) {
  console.log(result.output) // actual return value
} else {
  console.error(result.error)
}

// Quick unwrap (throws on error)
const output = await childTask.triggerAndWait({ data: "value" }).unwrap()
```

> Never wrap `triggerAndWait` in `Promise.all` or `Promise.allSettled` — not supported.

## Key Points

- **Result vs Output**: `triggerAndWait()` returns `{ ok, output, error }`, not direct output
- **Type safety**: Use `import type` for task references when triggering from backend API routes
- **Import constraints**: Tasks run outside Nuxt — cannot use auto-imports (`useDB`, `schema`, `createError`). Import directly from source files.
- **Waits > 5 seconds**: Automatically checkpointed, don't count toward compute

## Run status, TTL & expiry

`maxDuration` caps a **running** task. It does nothing for a run that never starts (e.g. no worker dequeues it) — that needs TTL.

### TTL → `EXPIRED` (detect "never dequeued")

A run not **dequeued by a worker** within its `ttl` auto-expires to status `EXPIRED`, server-side, platform-timed. This is the signal for "no worker claimed it" — you do **not** build a reaper for it.

```ts
// Per-trigger TTL
await myTask.trigger({ data: "x" }, { ttl: "1h" }) // string duration
await myTask.trigger({ data: "x" }, { ttl: 3600 }) // number = SECONDS

// Per-task default
export const t = task({ id: "t", ttl: "10m", run: async () => {} })

// Config-file default (overridable per-task/trigger; 0 opts out)
// trigger.config.ts → defineConfig({ ttl: "1h" })
```

- **Dev default TTL = 10 min.** A no-worker run locally already expires after ~10 min.
- **Prod has NO default TTL** unless set — a no-worker prod run sits queued forever otherwise. Set a `ttl` to bound it.
- For callback-token tasks, align `ttl` to the token lifetime: a run whose HMAC callback token has expired can't call back anyway, so expiring it is correct.

### Reading status — pull & push

```ts
import { runs } from "@trigger.dev/sdk/v3"

// PULL: fetch current status on demand (e.g. on page load, by stored triggerRunId)
const run = await runs.retrieve(triggerRunId) // run.status: EXPIRED | COMPLETED | FAILED | ...

// PUSH: async iterator, yields on each change, completes when the run finishes.
// This is Trigger.dev's OWN realtime (server-side) — independent of our app SSE/Supabase channel.
for await (const r of runs.subscribeToRun(triggerRunId)) {
  console.log(r.status)
}
```

## This Project's Tasks

Task files are `.js` (project is JS, not TS). Task ID = `const TASK_ID` in each file.

| Task ID | File | Purpose |
|:--|:--|:--|
| `receipt-workflow` | `trigger/receipt-workflow.js` | Orchestrator — chains OCR → annotations → normalize → create-expense → adjust-expense |
| `analyze-ocr` | `trigger/analyze-ocr.js` | Azure Document Intelligence OCR |
| `analyze-annotations` | `trigger/analyze-annotations.js` | GPT-4o annotation detection |
| `normalize-receipt` | `trigger/normalize-receipt.js` | GPT-4o receipt normalization |
| `create-expense` | `trigger/create-expense.js` | Creates an expense from the receipt total |
| `adjust-expense` | `trigger/adjust-expense.js` | GPT-4o adjusts the expense split (annotations + custom instructions) |

> Task IDs were renamed `create-split`/`adjust-split` → `create-expense`/`adjust-expense` (2026-06-24, with the HMAC scope `split:write` → `expense:write`). Old IDs no longer exist.

Workflow is triggered via `POST /api/workflows/[uploadId]`. Each task carries an action-scoped HMAC callback token (`shared/config/task-permissions.js`); the orchestrator mints per-child tokens via `POST /api/workflows/runs/:runUuid/tokens`.
