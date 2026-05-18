### Finely scoped HMAC Tokens

Each agentic worker has resource and action scoped tokens checked against two axes:

| Axis | Check |
|:--|:--|
| **Resource scope** | The requested resource ID must match the workflow run's linked upload (or its derived receipt / split) |
| **Action permission** | The route's `resource:permission` (e.g. `split:write`) must be in the task's signed action set |

A task with `split:write` cannot read receipts. A task scoped to upload `A` cannot access upload `B`. The HMACs won't match. See design details below.
