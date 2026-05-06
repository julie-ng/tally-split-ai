# Database Schema

Single source of truth for table structure, relationships, and status enums. Schema definitions live in `server/db/schema.ts` (Drizzle); enum constants live in `shared/enums/`.

## Conventions

- All status values are defined as enums in `shared/enums/` and exported as both an object (`UPLOAD_STATUS.UPLOADED`) and an array (`UPLOAD_STATUSES` for Drizzle/Zod).
- Never compare raw status strings — always import the constant. See `.claude/rules/enums.md`.
- `userId` always refers to `users.id` (UUID). GitHub's user id is always called `githubId`.

## Relationships overview

```
                              ┌──────────────┐
                              │  households  │
                              └──────┬───────┘
                ┌────────────────────┼────────────────────┐
                │                    │                    │
           1:many                1:many                1:many
                │                    │                    │
        ┌───────▼──────┐     ┌───────▼──────┐     ┌───────▼─────┐
        │    users     │     │   receipts   │     │   uploads   │
        └──────────────┘     └───────┬──────┘     └──────┬──────┘
                                     │                   │
                                  1:many              many:1
                                     │                   │
                                     │                   │
                                     │            (uploads.receiptId,
                                     │             nullable until OCR
                                     │             links them)
                                     │                   │
                                     ◄───────────────────┘
                                     │
                                  1:1 (canonical: splits.receiptId)
                                     │
                              ┌──────▼───────┐
                              │    splits    │
                              └──────────────┘
```

```
   ┌──────────────┐                       ┌──────────────────┐
   │   uploads    │── 1:many ────────────▶│  workflow_runs   │
   └──────────────┘                       └──────────────────┘

   ┌──────────────┐          ┌──────────────────┐
   │   changes    │── 1:many │  receipt_history │  (per-field, per-mutation)
   │              │── 1:many │  split_history   │
   └──────────────┘          └──────────────────┘
```

## Households

Groups of users that share receipts/uploads/splits.

> [!NOTE]
> POC constraint: max 2 members per household. Enforced at API layer (the add-user endpoint), not DB.

| Column | Type | Notes |
|:--|:--|:--|
| `id` | `uuid` PK | Random UUID |
| `name` | `text` | Nullable; auto-create uses `"{username}'s household"` |
| `description` | `text` | Nullable; auto-create uses `"Auto-generated personal household."` |
| `createdAt` | `timestamp` | |
| `updatedAt` | `timestamp` | |

## Users

Authenticated principals. One user belongs to one household.

| Column | Type | Notes |
|:--|:--|:--|
| `id` | `uuid` PK | Internal user ID |
| `githubId` | `bigint` UNIQUE | GitHub's numeric user id (immutable) |
| `householdId` | `uuid` NOT NULL FK → `households.id` | AuthZ scope; restrict on delete |
| `username` | `text` | Refreshed from GitHub on every login |
| `displayName` | `text` | Nullable |
| `initials` | `text` | User-editable; used for `paidBy` resolution |
| `avatarUrl` | `text` | Refreshed from GitHub on every login |
| `createdAt` | `timestamp` | |
| `lastLoginAt` | `timestamp` | Bumped on every OAuth login |

> [!IMPORTANT]
> Closed user set: rows are only created via the household member endpoint. OAuth login refreshes existing records but never creates new ones — unknown `githubId`s are rejected.

## Receipts

Business/finance data extracted from receipt uploads.

| Column | Type | Notes |
|:--|:--|:--|
| `id` | `serial` PK | |
| `title` | `text` | Default `Untitled`; LLM-normalized or user-edited |
| `merchantName`, `merchantAddress`, `merchantPhone` | `text` | OCR-extracted |
| `tags` | `text` | Comma-separated; derived from upload's azureTags |
| `date`, `time` | `text` | ISO strings; nullable if not extracted |
| `subtotal`, `tax`, `tip`, `total` | `real` | EUR (POC assumption) |
| `currency` | `text` | |
| `notes` | `text` | User-editable |
| `analysisStatus` | enum | `RECEIPT_ANALYSIS_STATUS` — see below |
| `userId` | `text` | Createdby metadata only — **not used for authZ** |
| `householdId` | `uuid` NOT NULL FK → `households.id` | AuthZ scope |
| `createdAt`, `updatedAt` | `timestamp` | |

### `RECEIPT_ANALYSIS_STATUS`

- **File:** `shared/enums/receipt-analysis-status.js`
- **Used in:** `receipts.analysis_status`

UI logic uses this to show or hide the "Analyze" button. Granular progress tracking lives in `workflow_runs`, not here.

| Key | Value | Set by |
|:--|:--|:--|
| `UNANALYZED` | `unanalyzed` | Default for new receipts |
| `ANALYZED` | `analyzed` | `analyze-ocr` task on success |

## Uploads

File/blob metadata for uploaded receipt images. Created before the corresponding receipt exists.

| Column | Type | Notes |
|:--|:--|:--|
| `id` | `serial` PK | |
| `hashId` | `text` UNIQUE | Public-facing identifier (used in URLs) |
| `userId` | `text` NOT NULL | Createdby metadata only — **not used for authZ** |
| `householdId` | `uuid` NOT NULL FK → `households.id` | AuthZ scope; set explicitly because uploads exist briefly before OCR creates the receipt |
| `title` | `text` | Default `Untitled` |
| `receiptId` | `integer` FK → `receipts.id` (cascade) | Nullable until OCR task links it |
| `status` | enum | `UPLOAD_STATUS` — see below |
| `blobName`, `blobUrl` | `text` UNIQUE | Azure Blob Storage paths |
| `thumbnailName`, `thumbnailUrl` | `text` | Generated post-upload |
| `originalFilename` | `text` | |
| `contentType`, `size` | | |
| `azureTags` | `jsonb` | Tags from filename (e.g. `#tip`) |
| `analysisStatus` | enum | `UPLOAD_ANALYSIS_STATUS` — see below |
| `analyzedAt` | `timestamp` | Set when full workflow completes |
| `ocrText` | `text` | Plain text OCR output |
| `ocrJson` | `jsonb` | Slimmed Document Intelligence response |
| `annotationsJson` | `jsonb` | GPT-4o annotation detection results |
| `createdAt`, `updatedAt`, `uploadedAt` | `timestamp` | |

### `UPLOAD_STATUS`

- **File:** `shared/enums/upload-status.js`
- **Used in:** `uploads.status`

Tracks the file upload lifecycle (Azure Blob upload).

| Key | Value | Set by |
|:--|:--|:--|
| `INITIALIZED` | `initialized` | Default; row created, no blob yet |
| `UPLOADED` | `uploaded` | Set after client confirms successful blob PUT |
| `FAILED` | `failed` | (not yet wired up) |

### `UPLOAD_ANALYSIS_STATUS`

- **File:** `shared/enums/upload-analysis-status.js`
- **Used in:** `uploads.analysis_status`

Upload-level convenience field updated by the workflow orchestrator so the frontend can show status without querying `workflow_runs`.

- **Upload** = "has the workflow finished processing this file?"
- **Receipt** = "did we successfully extract structured data from this file?"

| Key | Value | Set by |
|:--|:--|:--|
| `PENDING` | `pending` | Default |
| `QUEUED` | `queued` | Workflow endpoint when trigger fires |
| `PROCESSING` | `processing` | (implied by workflow running) |
| `COMPLETED` | `completed` | Orchestrator when workflow finishes |
| `FAILED` | `failed` | (not yet implemented) |

## Splits

Expense splitting between two household members.

> [!NOTE]
> POC schema hardcodes 2 users (`userOne`/`userTwo` slots). N-user splits would migrate to a `split_shares` join table. The 2-user cap is enforced at the household level (max 2 members).

| Column | Type | Notes |
|:--|:--|:--|
| `id` | `serial` PK | |
| `receiptId` | `integer` FK → `receipts.id` (set null) | Canonical link; splits are always created with a receipt today |
| `splitAmount` | `real` NOT NULL | Total to split (defaults to receipt total) |
| `userOneId` | `uuid` FK → `users.id` | First household member (oldest by `users.createdAt`) |
| `userOneShare` | `real` | Amount this user owes |
| `userTwoId` | `uuid` FK → `users.id` | Second household member; null in solo households |
| `userTwoShare` | `real` | Null in solo households |
| `paidByUserId` | `uuid` FK → `users.id` | Who actually paid (current value); set by LLM or user |
| `paidByMatch` | enum | `PAID_BY_MATCH` — frozen at LLM run time, see below |
| `isSettled` | `boolean` NOT NULL | Default `false` |
| `settledAt` | `timestamp` | |
| `notes` | `text` | User-editable |
| `createdAt`, `updatedAt` | `timestamp` | |

### `PAID_BY_MATCH`

- **File:** `shared/enums/paid-by-match.js`
- **Used in:** `splits.paid_by_match`

> [!IMPORTANT]
> This enum is **frozen at LLM run time**. It is *not* updated when a human edits `paidByUserId`. It tracks LLM matching behavior only — analytics derive "human disagreed with LLM" from the `changes` history, not from this column.

| Key | Value | Meaning |
|:--|:--|:--|
| `UNRESOLVED` | `unresolved` | LLM hasn't run yet (default) |
| `MISSING` | `missing` | LLM ran, no paidBy annotation found on the receipt |
| `MISMATCHED` | `mismatched` | LLM ran, found initials, but no household member matched |
| `MATCHED` | `matched` | LLM ran, found initials, mapped to a household member |

`MATCHED` does **not** mean "the LLM was correct." It means "the LLM extracted something we could map to a member." Whether that mapping was *correct* is answered by human edit history in the `changes` table. See `v_split_metrics` (below) for the LLM-accuracy-vs-human-correction metric.

> [!NOTE]
> AuthZ for splits derives `householdId` via `splits.receiptId → receipts.householdId`. Splits do not carry their own `householdId` column.

## workflow_runs

Tracks Trigger.dev workflow orchestration. One row per workflow run.

| Column | Type | Notes |
|:--|:--|:--|
| `id` | `serial` PK | |
| `uploadId` | `integer` FK → `uploads.id` (cascade) | |
| `uuid` | `uuid` NOT NULL | Opaque, used in HMAC callbacks |
| `triggerRunId` | `text` | For Trigger.dev dashboard linking |
| `status` | enum | `WORKFLOW_STATUS` — overall state |
| `ocrStatus` | enum | `WORKFLOW_STEP_STATUS` |
| `annotationsStatus` | enum | `WORKFLOW_STEP_STATUS` |
| `createSplitStatus` | enum | `WORKFLOW_STEP_STATUS` |
| `adjustSplitStatus` | enum | `WORKFLOW_STEP_STATUS` |
| `normalizeStatus` | enum | `WORKFLOW_STEP_STATUS` |
| `error` | `text` | |
| `createdAt`, `completedAt` | `timestamp` | |

### `WORKFLOW_STATUS`

- **File:** `shared/enums/workflow-status.js`
- **Used in:** `workflow_runs.status`

These are **our own enums** — not mirroring Trigger.dev's internal statuses. Trigger.dev has its own run states; we define and manage these ourselves based on task outcomes.

| Key | Value | Set by |
|:--|:--|:--|
| `QUEUED` | `queued` | Default on insert |
| `PROCESSING` | `processing` | Orchestrator (`receipt-workflow`) at start |
| `COMPLETED` | `completed` | Orchestrator after all steps finish |
| `PARTIAL` | `partial` | Orchestrator when non-fatal steps failed |
| `FAILED` | `failed` | Orchestrator if OCR fails (fatal) |

### `WORKFLOW_STEP_STATUS`

- **File:** `shared/enums/workflow-status.js`
- **Used in:** `workflow_runs.ocr_status`, `annotations_status`, `create_split_status`, `adjust_split_status`, `normalize_status`

Tracks individual steps within a workflow run. Each step task updates its own column.

| Key | Value | Set by |
|:--|:--|:--|
| `PENDING` | `pending` | Default — step hasn't started yet |
| `PROCESSING` | `processing` | Each task at start (e.g. `analyze-ocr`) |
| `COMPLETED` | `completed` | Each task on success |
| `FAILED` | `failed` | Each task on failure (or orchestrator on timeout) |

### `WORKFLOW_STEP`

- **File:** `shared/enums/workflow-step.js`
- **Used in:** SSE event payloads (not a DB column)

Names of individual workflow steps for UI/realtime updates.

| Key | Value |
|:--|:--|
| `OCR` | `ocr` |
| `ANNOTATIONS` | `annotations` |
| `NORMALIZE` | `normalize` |
| `SPLIT` | `createSplit` |
| `ADJUST_SPLIT` | `adjustSplit` |
| `WORKFLOW` | `workflow` |

## Changes + history tables

Field-level audit trail for mutations on receipts and splits.

| Table | Purpose |
|:--|:--|
| `changes` | One row per mutation. Records `source` (`user:<userId>` or `task:<taskName>`), `sourceVersion` (e.g. model version), `confidence`, `reasoning`. |
| `receipt_history` | One row per (changed field × change). Tracks `field`, `oldValue`, `newValue`, per-field `confidence`. |
| `split_history` | Same shape, for splits. |

A single mutation creates one `changes` row + N `*_history` rows (one per changed field).

```
   ┌──────────────┐
   │   changes    │
   │              │
   │  source      │ ── 1:many ──┐
   │  reasoning   │             │
   │  ...         │             ▼
   └──────────────┘     ┌──────────────────┐
                        │  receipt_history │
                        │  split_history   │
                        │                  │
                        │  field           │
                        │  oldValue        │
                        │  newValue        │
                        └──────────────────┘
```

> [!NOTE]
> The `changes.source` format (`user:<userId>` vs `task:<taskName>`) is the basis for AI-vs-human attribution in `v_split_metrics`.

## `v_split_metrics` (view)

Analytics view aggregating per-split LLM signals + human override flag. Read-only, joined from `splits`, `receipts`, `changes`, and `split_history`. Used by `GET /api/dashboard/metrics`.

> [!NOTE]
> Hand-written SQL migration (`0016_split_metrics_view.sql`) — Drizzle's relational query API does not model views. Queries use raw SQL via `db.execute(sql\`...\`)`.

> [!WARNING]
> Hand-written view migrations: use `CREATE OR REPLACE VIEW` (not `CREATE VIEW`) for idempotency. Also: drizzle-kit's migrator skips a migration unless its journal `when` is strictly greater than the max `created_at` in `__drizzle_migrations` — so if a hand-written migration has a future `when`, every later auto-generated migration's `when` must be bumped above it manually, or drizzle silently no-ops with zero output.

| Column | Source | Notes |
|:--|:--|:--|
| `split_id` | `splits.id` | |
| `receipt_id` | `splits.receipt_id` | |
| `household_id` | `receipts.household_id` | Scope filter for all dashboard queries |
| `receipt_date` | `receipts.date` | |
| `paid_by_match` | `splits.paid_by_match` | Frozen LLM signal |
| `is_settled` | `splits.is_settled` | |
| `split_created_at` | `splits.created_at` | Used for activity windows |
| `llm_confidence` | latest `task:*` row in `changes` joined via `split_history` | Null if LLM never ran |
| `paid_by_overridden_by_human` | EXISTS check on `split_history.field = 'paidByUserId'` with `user:*` source | Boolean |

## Status enum cross-reference

Quick lookup for "where is this status used":

| Enum | Column |
|:--|:--|
| `UPLOAD_STATUS` | `uploads.status` |
| `UPLOAD_ANALYSIS_STATUS` | `uploads.analysis_status` |
| `RECEIPT_ANALYSIS_STATUS` | `receipts.analysis_status` |
| `WORKFLOW_STATUS` | `workflow_runs.status` |
| `WORKFLOW_STEP_STATUS` | `workflow_runs.ocr_status`, `annotations_status`, `create_split_status`, `adjust_split_status`, `normalize_status` |
| `WORKFLOW_STEP` | (SSE payloads, not a column) |
| `PAID_BY_MATCH` | `splits.paid_by_match` |

> [!NOTE]
> **Naming inconsistencies (TODO):** `pending` vs `queued`, `completed` vs `analyzed`, `processing` vs (implied) — these evolved organically across phases. Not critical for the POC.
