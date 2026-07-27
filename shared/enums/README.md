# Enums

_Last updated:  27 July 2026_

Single source of truth for status values across the stack. Never hardcode these strings. 

See also [`.claude/rules/enums.md`](../../.claude/rules/enums.md).

## Exports

Each enum file exports:

| Export type | Example | Note |
|:--|:--|:--|
| **Object** | `WORKFLOW_RUN_STATUS` | Keyed access in code |
| **Aggregation as Array** | `WORKFLOW_RUN_STATUSES` | Via `Object.values()`. For Drizzle `text({ enum })` columns and Zod `z.enum()` |

> [!NOTE]
> Only create Array if Drizzle or Zod needs it.

## File Naming

- Named for their **subject** (`upload-status`, `paid-by-match`), not their shape.
- No `.enums.js` suffix — the directory already says that.
- Contrast `.utils.js`, which earns its suffix by disambiguating `app/` vs `server/` vs `shared/`.
- The taxonomy lives in this file, not in filenames — reclassifying costs an edit here vs rename plus import churn.

---

## Four (4) types of Enums

Several enums share values (`failed`, `completed`) while describing completely different subjects - which is a **coincidental overlap of vocabulary**.

To help keep them straight, 4 types of enums have been identified:

### Type 1 - Lifecycle Status

_**Where** is this in its lifecycle?_

Moves over time. Has a start state, transitions, and usually terminal states.

| File | Subject |
|:--|:--|
| `workflow-run-status.js` | one orchestration run, as a whole |
| `workflow-step-status.js` | one step within a run |
| `upload-status.js` | the persisted blob row |
| `upload-analysis-status.js` | rollup of the run status onto the upload |

- A run is an **aggregate** over steps.
- A `partial` run means some steps failed (not skipped), e.g. annotations or payer assignment. But receipt and expense were created, so the pipeline continues.
- Steps can be `skipped`. They are deliberately separate enums, not one superset.

### Type 2 - Classification 

_**What** kind of result was this?_

- Stamped **once** and frozen. 
- Records an outcome, not aposition in a lifecycle.

| File | Subject |
|:--|:--|
| `paid-by-match.js` | outcome of the LLM's payer-matching attempt |

> [!TIP]
> A classification, e.g. `mismatched` is NOT a _problem_ state. It is a **outcome/result**, e.g. LLM findings do not match user initials.

### Type 3 - Registry 

_**Which** one of a fixed set?_

- Identity, not state. 
- Names the members of a closed set.

| File | Subject |
|:--|:--|
| `workflow-step.js` | which pipeline step (`ocr`, `annotations`, …) |

> [!WARNING]
> For `WORKFLOW_STEP`, the column names, e.g. `create_expense_status` are dervied from **values**, e.g. `createExpense`, not the keys, e.g. `EXPENSE`.

### Type 4 - UI config

_How does this render?_

- Presentation only, hence `.config.js` suffix.
- keyed off an enum above. 

| File | Subject |
|:--|:--|
| `workflow-status-ui.config.js` | run + step status → label, color, icon, dot |

> [!IMPORTANT]
> Tailwind constraint: every class string here must be a **complete literal**, e.g. `text-success`. 
> Never interpolate (`text-${x}-500`) — a runtime-built class name gets purged at build time.
