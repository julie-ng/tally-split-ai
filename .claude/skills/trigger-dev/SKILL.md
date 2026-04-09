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

## This Project's Tasks

| Task | File | Purpose |
|:--|:--|:--|
| `receipt-workflow` | `trigger/receipt-workflow.ts` | Orchestrator — chains OCR → annotations → split |
| `analyze-ocr` | `trigger/analyze-ocr.ts` | Azure Document Intelligence OCR |
| `analyze-annotations` | `trigger/analyze-annotations.ts` | GPT-4o annotation detection |
| `create-split` | `trigger/create-split.ts` | Creates split from receipt total |

Workflow is triggered via `POST /api/workflows/[uploadHashId]`.
