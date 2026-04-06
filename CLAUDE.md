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
- **Database**: SQLite with Drizzle ORM for local development
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
- **Database**: SQLite + Drizzle ORM — file at `.data/db/sqlite.db`
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
