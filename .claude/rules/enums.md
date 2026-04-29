# Enums

Status enums live in `shared/enums/` and are the single source of truth for status values across the stack.

For the full list of enums, their values, and the columns they're used in, see [`docs/SCHEMA.md`](../../docs/SCHEMA.md).

## Never hardcode status strings

Always import and use the enum constants — never compare against raw strings.

```js
// ❌ DO NOT DO THIS
if (workflow.status === 'failed') { ... }
if (upload.analysisStatus !== 'completed') { ... }

// ✅ DO THIS
import { WORKFLOW_STATUS } from '#shared/enums/workflow-status.js'
if (workflow.status === WORKFLOW_STATUS.FAILED) { ... }
```

## How enums are exported

Each file exports:
- **Object** (e.g. `WORKFLOW_STATUS`) — keyed access in code (`WORKFLOW_STATUS.PROCESSING`)
- **Array** (e.g. `WORKFLOW_STATUSES`) — derived via `Object.values()`, typed as a tuple, for Drizzle `text({ enum })` columns and Zod `z.enum()`

## Import paths

Use Node.js subpath imports for all cross-boundary imports:

```js
import { X } from '#shared/enums/file.js'
```
