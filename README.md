# Tally Split AI

A proof of concept app for learning AI Engineering.

## Use Case

Analyze scans (photos) of receipts, which also have handwritten adjustments for purpose of splitting expenses.

### Scenario

- Without a joint bank account, how can expenses be split between people?
- For receipts with shared and individual items, how can we indicate that some items are to be split between persons and others not?

## Stack

| Component | Role |
|:--|:--|
| Postgres | Database for receipts, splits, and workflow state |
| Drizzle Studio | Optional UI for inspecting the database |
| Nuxt | Full-stack web app (UI + API) |
| Trigger.dev | Async workflow orchestration |
| Azure Blob Storage | Receipt photo storage (direct client uploads via SAS) |
| Azure Document Intelligence | OCR for receipts (`prebuilt-receipt` model) |
| GPT-4o | Handwritten annotation detection |
| GPT-4o-mini | Receipt normalization & split adjustment |

### Local Development

Note: offline development is not possible due to Azure, LLM, and Trigger.dev dependencies.

#### Postgres

```bash
docker compose up -f docker-compose.dev.yaml -d
```

#### Nuxt App

```bash
npm run dev
```
Open http://localhost:3000/

#### Trigger.dev

Connect to trigger.dev (orchestrator) to use local machine as a worker/agent.

```
npm run trigger:dev
```

#### Drizzle Studio (optional)

Drizzle provides a UI to explore database

```bash
npm run db:studio
```

Open https://local.drizzle.studio/

---

## Docs

_As of April 2025, docs are scattered brain dumps. Clean up needed._

| Path | Target Audenience |
|:--|:--|
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | High-level system architecture |
| [`docs/`](./docs) | for Human understanding and reference |
| [`docs/SECURITY.md`](./docs/SECURITY.md) | Security model |
| [`trigger/README.md`](./trigger/README.md) | Trigger.dev tasks — how to run and trigger them |
| [`shared/enums/README.md`](./shared/enums/README.md) | Enum conventions |
| [`.claude/rules/`](./.claude/rules) | Instructions for agent (always loaded) |
| [`.claude/skills/`](./.claude/skills) | Loaded on Demand |
| [`CLAUDE.md`](./CLAUDE.md) | General agent instructions |

## Features

#### Frontend UI

- [x] UI to upload files (drag-and-drop, queued, direct-to-Azure)
- [x] UI to view/edit/delete receipts
- [x] UI for splits (via receipt view page)
- [x] Receipt inbox view (list + preview at `/receipts/inbox`)
- [x] Real-time workflow status updates via SSE
- [ ] SSO with GitHub

#### Backend Functionality

- [x] Blob SAS tokens on-demand
- [x] Document Intelligence API — OCR via Blob URL + SAS token
- [x] Pino structured logging with domain-based child loggers
- [x] Field-level change history for receipts and splits (human + agent mutations)

#### Annotation Functionality

- [x] Deploy GPT-4o model for analyzing images for handwritten annotations
- [x] Send API request with 1) OCR JSON and 2) Blob URL
- [x] Process response, e.g. probability

#### Workflow Orchestration

- [x] Trigger.dev orchestrator: OCR → annotations → split creation → adjust split
- [x] Per-step progress tracking in `workflow_runs` table
- [x] HMAC-authenticated HTTP API for tasks (no direct DB access)
- [x] Action-scoped tokens — minimum permissions per child task
