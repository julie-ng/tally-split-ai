# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Context

- Current year: 2026

## Project Overview

AI Receipts POC is a proof-of-concept application for analyzing scanned receipts with handwritten annotations to split expenses between people. The app uses Azure Document Intelligence Service (formerly Form Recognizer) to perform OCR and extract structured data from receipt photos.

### Core Use Case

- Analyze receipt photos that include handwritten adjustments for expense splitting
- Extract merchant info, transaction details, line items, and totals
- Future goal: recognize handwritten initials (e.g., "JN", "MM") and circled items to determine payment responsibility

#### Key Assumptions for POC

- Receipts are always in EUR
- Receipt Transactions are always in Germany

---

## Project Structure

This is a [**Nuxt 4** application](https://nuxt.com/docs/4.x/getting-started/introduction) with the following structure:

```
.
├── app/                           # Nuxt application directory
│   ├── components/                # Vue components (auto-imported)
│   │   ├── Receipt/               # Receipt-specific components
│   │   ├── Upload/                # Upload detail page components
│   │   └── Uploads/               # Upload queue components
│   ├── composables/               # Nuxt composables (auto-imported)
│   │   └── useUploadObject.js     # Upload object factory
│   ├── layouts/                   # Vue layouts
│   ├── pages/                     # File-based routing
│   │   └── uploads/               # Upload management pages
│   ├── plugins/                   # Nuxt plugins
│   ├── stores/                    # Pinia stores
│   │   ├── uploads.store.js       # Upload queue management
│   │   └── user.store.js          # User state management
│   └── utils/                     # Client-side utilities
├── server/                        # Nuxt server directory
│   ├── api/                       # API endpoints (auto-registered)
│   │   ├── analyze/               # Azure Document Intelligence integration
│   │   ├── blobs/                 # Azure Blob Storage operations
│   │   ├── tokens/                # SAS token generation
│   │   └── uploads/               # Upload CRUD operations
│   ├── db/                        # Database setup (Drizzle ORM)
│   │   ├── schema.ts              # Database schema
│   │   └── migrations/            # Database migrations
│   └── utils/                     # Server-side utilities
├── shared/                        # Shared utilities (auto-imported, client + server)
│   └── utils/                     # Shared helper functions
├── samples/                       # Development samples
│   ├── document-intelligence.studio.js  # Reference SDK usage
│   └── responses/                 # Sample API responses for testing
├── scans/                         # Receipt photo storage for testing (gitignored)
└── public/                        # Static assets
```

### Key Architecture Notes

- **Auto-imports**: Nuxt auto-imports components, composables, and utilities
- **File-based routing**: Pages directory maps to routes automatically
- **API routes**: Server API endpoints are auto-registered from `server/api/`
- **State management**: Pinia stores for reactive state (uploads, user)
- **Database**: PostgreSQL 17 (Docker) + Drizzle ORM
- **Client-side uploads**: Direct-to-Azure uploads using SAS tokens (no server proxy)

---

## Core Functionality

- Users upload receipt photos via drag-and-drop; uploads are queued and sent directly to Azure Blob Storage
- Filenames encode pre-curated data: `(41.95)` for total in EUR, `#tip` for tags, `YYYY-MM-DD` for dates
- Azure Document Intelligence analyzes receipts to extract merchant info, line items, and totals
- Each upload should create a separate Receipt entry in the database (separation of blob storage from business domain)
- Flag mismatched totals for human review (frontend only)

---

## Technology Stack

- **Framework**: Nuxt 4 full-stack app with hybrid SSR (server + client rendering)
- **Database**: PostgreSQL 17 + Drizzle ORM — Docker via `docker compose -f docker-compose.dev.yaml up -d`
- **Storage**: Azure Blob Storage (direct client uploads via SAS tokens — never through server)
- **AI/OCR**: Azure Document Intelligence (`prebuilt-receipt` model, API version 2024-11-30)
- **Frontend**: Vue 3, Pinia stores, NuxtUI, Tailwind CSS
- **Testing**: Vitest unit tests for utility functions
- **Language**: JavaScript with Factory/Composable pattern (TypeScript deferred for now)

### Environment Setup

Required env vars (see `.env.sample`):

```bash
export AZ_FORM_RECOGNIZER_ENDPOINT=""
export AZ_FORM_RECOGNIZER_KEY=""
```

---

## Key Principles

- **Zod schemas are the single source of truth** — used for validation in both frontend and backend. Never manually type-check fields in API handlers. See `.claude/rules/zod-validation.md`.
- **All Azure SDK usage is server-side only** — access keys must never be exposed to the client.
- **Explicit utility functions over middleware** — use `requireUserId(event)`, `requireHashIdParam(event)` at the top of each handler.
- **Use `createError()` over `new Error()`** for Nuxt-aware error handling across server and client.
- **Stores must not reference each other** — keep Pinia stores independent.

---

## Known Limitations

The `prebuilt-receipt` model does not handle:
- Handwriting analysis for initials or annotations
- Recognition of circled items or manual highlights
- Custom expense-splitting logic

These features would require a custom trained model.

---

## Skills & Rules

Detailed coding conventions and workflow guides live in `.claude/`:

- **Rules** (always loaded, some path-scoped): `.claude/rules/`
  - `code-style.md` — ESLint, file naming, utility placement
  - `zod-validation.md` — validation patterns with code examples
  - `vue-component-conventions.md` — naming, `defineModel`, validation responsibility
  - `server-api-patterns.md` — handler template, error handling
  - `nuxt-best-practices.md` — `callOnce`, `createError`, `<ClientOnly>`

- **Skills** (on-demand via `/skill-name`): `.claude/skills/`
  - `/database-operations` — schema changes, migrations, seed scripts
  - `/azure-blob-storage` — SAS tokens, direct uploads, filename conventions
  - `/azure-document-intelligence` — model details, response structure, optional fields
  - `/add-api-endpoint` — step-by-step new API route creation
  - `/vue-components` — component conventions, structure, patterns
  - `/pinia-stores` — store structure, caching, optimistic updates


<!-- TRIGGER.DEV basic START -->
# Trigger.dev Basic Tasks (v4)

**MUST use `@trigger.dev/sdk`, NEVER `client.defineJob`**

## Basic Task

```ts
import { task } from "@trigger.dev/sdk";

export const processData = task({
  id: "process-data",
  retry: {
    maxAttempts: 10,
    factor: 1.8,
    minTimeoutInMs: 500,
    maxTimeoutInMs: 30_000,
    randomize: false,
  },
  run: async (payload: { userId: string; data: any[] }) => {
    // Task logic - runs for long time, no timeouts
    console.log(`Processing ${payload.data.length} items for user ${payload.userId}`);
    return { processed: payload.data.length };
  },
});
```

## Schema Task (with validation)

```ts
import { schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";

export const validatedTask = schemaTask({
  id: "validated-task",
  schema: z.object({
    name: z.string(),
    age: z.number(),
    email: z.string().email(),
  }),
  run: async (payload) => {
    // Payload is automatically validated and typed
    return { message: `Hello ${payload.name}, age ${payload.age}` };
  },
});
```

## Triggering Tasks

### From Backend Code

```ts
import { tasks } from "@trigger.dev/sdk";
import type { processData } from "./trigger/tasks";

// Single trigger
const handle = await tasks.trigger<typeof processData>("process-data", {
  userId: "123",
  data: [{ id: 1 }, { id: 2 }],
});

// Batch trigger (up to 1,000 items, 3MB per payload)
const batchHandle = await tasks.batchTrigger<typeof processData>("process-data", [
  { payload: { userId: "123", data: [{ id: 1 }] } },
  { payload: { userId: "456", data: [{ id: 2 }] } },
]);
```

### Debounced Triggering

Consolidate multiple triggers into a single execution:

```ts
// Multiple rapid triggers with same key = single execution
await myTask.trigger(
  { userId: "123" },
  {
    debounce: {
      key: "user-123-update",  // Unique key for debounce group
      delay: "5s",              // Wait before executing
    },
  }
);

// Trailing mode: use payload from LAST trigger
await myTask.trigger(
  { data: "latest-value" },
  {
    debounce: {
      key: "trailing-example",
      delay: "10s",
      mode: "trailing",  // Default is "leading" (first payload)
    },
  }
);
```

**Debounce modes:**
- `leading` (default): Uses payload from first trigger, subsequent triggers only reschedule
- `trailing`: Uses payload from most recent trigger

### From Inside Tasks (with Result handling)

```ts
export const parentTask = task({
  id: "parent-task",
  run: async (payload) => {
    // Trigger and continue
    const handle = await childTask.trigger({ data: "value" });

    // Trigger and wait - returns Result object, NOT task output
    const result = await childTask.triggerAndWait({ data: "value" });
    if (result.ok) {
      console.log("Task output:", result.output); // Actual task return value
    } else {
      console.error("Task failed:", result.error);
    }

    // Quick unwrap (throws on error)
    const output = await childTask.triggerAndWait({ data: "value" }).unwrap();

    // Batch trigger and wait
    const results = await childTask.batchTriggerAndWait([
      { payload: { data: "item1" } },
      { payload: { data: "item2" } },
    ]);

    for (const run of results) {
      if (run.ok) {
        console.log("Success:", run.output);
      } else {
        console.log("Failed:", run.error);
      }
    }
  },
});

export const childTask = task({
  id: "child-task",
  run: async (payload: { data: string }) => {
    return { processed: payload.data };
  },
});
```

> Never wrap triggerAndWait or batchTriggerAndWait calls in a Promise.all or Promise.allSettled as this is not supported in Trigger.dev tasks.

## Waits

```ts
import { task, wait } from "@trigger.dev/sdk";

export const taskWithWaits = task({
  id: "task-with-waits",
  run: async (payload) => {
    console.log("Starting task");

    // Wait for specific duration
    await wait.for({ seconds: 30 });
    await wait.for({ minutes: 5 });
    await wait.for({ hours: 1 });
    await wait.for({ days: 1 });

    // Wait until specific date
    await wait.until({ date: new Date("2024-12-25") });

    // Wait for token (from external system)
    await wait.forToken({
      token: "user-approval-token",
      timeoutInSeconds: 3600, // 1 hour timeout
    });

    console.log("All waits completed");
    return { status: "completed" };
  },
});
```

> Never wrap wait calls in a Promise.all or Promise.allSettled as this is not supported in Trigger.dev tasks.

## Key Points

- **Result vs Output**: `triggerAndWait()` returns a `Result` object with `ok`, `output`, `error` properties - NOT the direct task output
- **Type safety**: Use `import type` for task references when triggering from backend
- **Waits > 5 seconds**: Automatically checkpointed, don't count toward compute usage
- **Debounce + idempotency**: Idempotency keys take precedence over debounce settings

## NEVER Use (v2 deprecated)

```ts
// BREAKS APPLICATION
client.defineJob({
  id: "job-id",
  run: async (payload, io) => {
    /* ... */
  },
});
```

Use SDK (`@trigger.dev/sdk`), check `result.ok` before accessing `result.output`

<!-- TRIGGER.DEV basic END -->