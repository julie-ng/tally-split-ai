# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Context

- Current year: 2026

## Documentation Sources (verify, don't guess)

Do NOT design from training data for fast-moving products. Before implementing, consult the authoritative source:

- **Supabase** — invoke the `supabase` skill and verify against current Supabase docs FIRST, before designing. (Supabase's JWT/RLS/Realtime behavior has changed; training-data assumptions have been wrong here.)
- **Nuxt / Nuxt UI** — prefer the **Nuxt MCP server** (`nuxt-remote`, if connected) and the `nuxt-ui` skill over context7. Fall back to Nuxt docs if the MCP server isn't available.
- **Everything else** (non-Nuxt, non-Supabase libraries) — use **context7**.

## Project Overview

AI Receipts POC is a proof-of-concept application for analyzing scanned receipts with handwritten annotations to split expenses between people. The app uses Azure Document Intelligence Service (formerly Form Recognizer) to perform OCR and extract structured data from receipt photos, and GPT-4o to detect handwritten annotations (initials, circles, strikethroughs).

### Core Use Case

- Analyze receipt photos that include handwritten adjustments for expense splitting
- Extract merchant info, transaction details, line items, and totals
- Detect handwritten annotations (initials, circles, strikethroughs) to determine payment responsibility

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
├── trigger/                       # Trigger.dev task definitions
│   ├── receipt-workflow.js        # Orchestrator: OCR → annotations → normalize → expense → adjust
│   ├── analyze-ocr.js             # Azure Document Intelligence OCR (deterministic, FATAL)
│   ├── analyze-annotations.js     # GPT-4o handwriting/annotation detection (non-fatal)
│   ├── normalize-receipt.js       # GPT-4o-mini: clean date/year, title, filename (non-fatal)
│   ├── create-expense.js          # Expense from receipt total (deterministic, non-fatal)
│   ├── adjust-expense.js          # GPT-4o-mini: asymmetric split (LLM-consent-gated, non-fatal)
│   ├── delete-blobs.js            # Azure blob cleanup on expense/receipt delete
│   ├── instructions/              # LLM system prompts (.md) for the AI tasks
│   └── utils/                     # api-client, notify-status helpers
├── server/                        # Nuxt server directory
│   ├── api/                       # API endpoints (auto-registered)
│   │   ├── analysis/              # Analysis endpoints (trigger tasks)
│   │   ├── blobs/                 # Azure Blob Storage operations
│   │   ├── receipts/              # Receipt CRUD
│   │   ├── splits/                # Split CRUD
│   │   ├── tokens/                # SAS token generation
│   │   ├── uploads/               # Upload CRUD
│   │   └── workflow/              # Workflow trigger endpoint
│   ├── db/                        # Database setup (Drizzle ORM)
│   │   ├── schema.ts              # Database schema
│   │   ├── connection.ts          # PostgreSQL connection (pg.Pool)
│   │   └── migrations/            # Database migrations
│   └── utils/                     # Server-side utilities
├── shared/                        # Shared utilities (auto-imported, client + server)
│   └── utils/                     # Shared helper functions
├── tests/                         # Integration tests
│   └── integration/               # Cross-layer pipeline tests
├── samples/                       # Development samples
├── scans/                         # Receipt photo storage for testing (gitignored)
└── public/                        # Static assets
```

### Key Architecture Notes

- **Auto-imports**: Nuxt auto-imports components, composables, and utilities
- **File-based routing**: Pages directory maps to routes automatically
- **API routes**: Server API endpoints are auto-registered from `server/api/`
- **State management**: Pinia stores for reactive state (uploads, user)
- **Database**: PostgreSQL 17 (Docker) + Drizzle ORM
- **Async workflows**: Trigger.dev orchestrates a fixed 5-step pipeline (deterministic control flow; LLMs are perception/extraction components, not agents — see `trigger/README.md`)
- **Client-side uploads**: Direct-to-Azure uploads using SAS tokens (no server proxy)

---

## Core Functionality

- Users upload receipt photos via drag-and-drop; uploads are queued and sent directly to Azure Blob Storage
- Filenames encode pre-curated data: `(41.95)` for total in EUR, `YYYY-MM-DD` for dates
- After upload, a Trigger.dev workflow automatically runs: OCR → annotation detection → receipt normalization → expense creation → split adjustment
- Each upload creates a Receipt entry (via OCR analysis) and an Expense entry (from receipt total, defaulting to a 50/50 split)
- Only OCR is fatal; the AI steps degrade gracefully (run finishes `PARTIAL`, expense stays editable). The `adjust-expense` step is gated on `households.llmConsent` — it's the only step that sends member names to the LLM
- The `workflow_runs` table tracks per-step progress; `uploads.analysisStatus` is a convenience field updated by the orchestrator

---

## Technology Stack

- **Framework**: Nuxt 4 full-stack app with hybrid SSR (server + client rendering)
- **Database**: PostgreSQL 17 + Drizzle ORM — Docker via `docker compose -f docker-compose.dev.yaml up -d`
- **Storage**: Azure Blob Storage (direct client uploads via SAS tokens — never through server)
- **AI/OCR**: Azure Document Intelligence (`prebuilt-receipt` model, API version 2024-11-30)
- **Annotations**: GPT-4o via the [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) for handwriting/annotation detection
- **Workflows**: Trigger.dev for async task orchestration (OCR, annotations, splits)
- **Frontend**: Vue 3, Pinia stores, NuxtUI, Tailwind CSS
- **Testing**: Vitest — unit tests (co-located with source) + integration tests (`tests/`)
- **Language**: JavaScript with Factory/Composable pattern (TypeScript for schema, connection, trigger tasks)

### Environment Setup

Required env vars (see `.env.sample`):

```bash
# Azure Document Intelligence
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=""
AZURE_DOCUMENT_INTELLIGENCE_KEY=""

# Azure Storage
AZURE_STORAGE_ACCOUNT=""
AZURE_STORAGE_ACCOUNT_KEY=""
AZURE_STORAGE_CONTAINER_NAME=""

# AI Gateway (annotations, normalization, split adjustment)
AI_GATEWAY_API_KEY=""
AI_GATEWAY_ANNOTATIONS_MODEL="openai/gpt-4o"
AI_GATEWAY_RECEIPT_MODEL="openai/gpt-4o-mini"

# Postgres (local Docker)
POSTGRES_DB=""
POSTGRES_USER=""
POSTGRES_PASSWORD=""
NUXT_DATABASE_URL=""

# Trigger.dev
TRIGGER_SECRET_KEY=""
```

### Running Locally

```bash
docker compose -f docker-compose.dev.yaml up -d   # Start Postgres
npm run dev                                         # Start Nuxt
npx trigger dev                                     # Start Trigger.dev worker (separate terminal)
```

---

## Key Principles

- **Zod schemas are the single source of truth** — used for validation in both frontend and backend. Distinguish between request schemas (HTTP input) and insert schemas (DB writes). See `.claude/rules/zod-validation.md`.
- **All Azure SDK usage is server-side only** — access keys must never be exposed to the client.
- **Explicit utility functions over middleware** — use `guards.requireAuthentication(event)`, `guards.requireHashIdParam(event)` at the top of each handler.
- **Use `createError()` over `new Error()`** for Nuxt-aware error handling in API handlers. Use plain `Error` in server utils and trigger tasks (which run outside Nuxt).
- **Stores must not reference each other** — keep Pinia stores independent.
- **Trigger tasks import directly** — tasks run outside Nuxt and cannot use auto-imports. Import from `../server/db/connection`, `../server/utils/`, `../shared/utils/` directly.

---

## Skills & Rules

Detailed coding conventions and workflow guides live in `.claude/`:

- **Rules** (always loaded, some path-scoped): `.claude/rules/`
  - `code-style.md` — ESLint, file naming, utility placement, comment/markdown style
  - `agent-communication.md` — how to communicate in chat (questions, corrections, summaries)
  - `zod-validation.md` — validation patterns with code examples
  - `vue-component-conventions.md` — naming, `defineModel`, validation responsibility
  - `server-api-patterns.md` — handler template, error handling
  - `nuxt-best-practices.md` — `callOnce`, `createError`, `<ClientOnly>`
  - `enums.md` — status enums in `shared/enums/`; never hardcode status strings
  - `user-store.md` — don't alias `useUserStore` ComputedRefs (breaks reactivity)
  - `database-timestamps.md` — (scoped to `server/db/**`) instants → `timestamptz`

- **Skills** (on-demand via `/skill-name`): `.claude/skills/`
  - `/database-operations` — schema changes, migrations, seed scripts
  - `/azure-blob-storage` — SAS tokens, direct uploads, filename conventions
  - `/azure-document-intelligence` — model details, response structure, optional fields
  - `/trigger-dev` — task definitions, triggering, orchestrator patterns
  - `/add-api-endpoint` — step-by-step new API route creation
  - `/vue-components` — component conventions, structure, patterns
  - `/pinia-stores` — store structure, caching, optimistic updates
