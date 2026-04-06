# AI Receipts POC

A proof of concept app for learning purposes.

### Frontend-only Features (not persisted in DB)

- **Mismatch detection** — compares filename-encoded total with OCR result, flags mismatches with red badge
- **Split validation** — checks if user shares sum to the split total (with floating-point tolerance)
- **Monthly split filtering** — filters splits by receipt date, no "split month" column in DB
- **Monthly settlement status** — derives whether all splits in a month are settled
- **Upload concurrency control** — enforces max 3 concurrent uploads client-side

## Use Case

Analyze scans (photos) of receipts, which also have handwritten adjustments for purpose of splitting expenses.

### Scenario

- Without a joint bank account, how can expenses be split between people?
- For receipts with shared and individual items, how can we indicate that some items are to be split between persons and others not?

## Docs

| Path | Target Audenience |
|:--|:--|
| [`docs/`](./docs) | for Human understanding and reference |
| [`.claude/rules/`](./.claude/rules) | Instructions for agent (always loaded) |
| [`.claude/skills/`](./.claude/skills) | Loaded on Demand |
| [`CLAUDE.md`](./CLAUDE.md) | General agent instructions |

## Azure

- Region: `eastus`
- Resource group: `ai-expenses-rg`

---

## App Progress

High level overview. See [Issues](https://github.com/jngai/ai-receipts-poc/issues) for additional details.

#### Frontend UI

- [x] UI to upload files
- [x] UI to view/edit/delete receipts
- [x] UI for splits (via receipt view page)

#### Backend Functionality

- [x] Blob SAS tokens on-demand
- [x] Document Intelligence API - sends Blob URL with sas token to Azure service

#### Annotation Functionality

- [ ] Deploy GPT-4o model for analyzing images for handwritten annotations.
- [ ] Send API request with 1) OCR JSON and 2) Blob URL
- [ ] Process response, e.g. probabilty?
