# Enums

Status enums live in `shared/enums/` and are the single source of truth for status values across the stack.

## Never hardcode status strings

Always import and use the enum constants — never compare against raw strings.

```js
// ❌ DO NOT DO THIS
if (workflow.status === 'failed') { ... }
if (upload.analysisStatus !== 'completed') { ... }

// ✅ DO THIS
import { WORKFLOW_STATUS } from '~~/shared/enums/workflow-status.js'
if (workflow.status === WORKFLOW_STATUS.FAILED) { ... }

import { UPLOAD_ANALYSIS_STATUS } from '~~/shared/enums/upload-analysis-status.js'
if (upload.analysisStatus !== UPLOAD_ANALYSIS_STATUS.COMPLETED) { ... }
```

## Available Enums

| File | Object Export | Values |
|:--|:--|:--|
| `upload-status.js` | `UPLOAD_STATUS` | `INITIALIZED`, `UPLOADED`, `FAILED` |
| `upload-analysis-status.js` | `UPLOAD_ANALYSIS_STATUS` | `PENDING`, `QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED` |
| `receipt-analysis-status.js` | `RECEIPT_ANALYSIS_STATUS` | `UNANALYZED`, `ANALYZED` |
| `workflow-status.js` | `WORKFLOW_STATUS` | `QUEUED`, `PROCESSING`, `COMPLETED`, `PARTIAL`, `FAILED` |
| `workflow-status.js` | `WORKFLOW_STEP_STATUS` | `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED` |

Each file also exports an array variant (e.g., `UPLOAD_STATUSES`) typed as a tuple for use in Drizzle `enum` columns and Zod `z.enum()`.

## Import Paths

- From `app/`: `import { X } from '~~/shared/enums/file.js'`
- From `server/`: `import { X } from '../../shared/enums/file.js'` (relative)
- From `trigger/`: `import { X } from '../shared/enums/file.js'` (relative)
