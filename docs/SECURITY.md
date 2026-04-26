# Security Model

This document describes the authentication and authorization architecture for the application, including how human users and headless agents (Trigger.dev tasks) authenticate and what they are authorized to access.

## Principals

There are two types of principals in this system. They are always separate and never share identity or auth paths.

### Human Principals (Users)

Human users authenticate via sessions. The session establishes `event.context.userId`, which is used for ownership-based authorization checks.

### Service Principals (Tasks)

Trigger.dev tasks are headless agents that process receipts. They authenticate via action-scoped HMAC tokens — each task receives a unique token encoding its allowed permissions. A task never authenticates as a user — it authenticates as itself. The token establishes `event.context.workflowRun`, `event.context.taskId`, and `event.context.taskActions`.

Both principal types set `event.context.securityPrincipal` — a string in the format `user:<userId>` or `task:<taskId>` — used for audit trail logging (change history source).

> [!IMPORTANT]
> A task must never be granted a `userId` or act "on behalf of" a user. The principal types are analogous to Azure's user principals vs. service principals — same platform, fully separate identity types.

## Authentication (AuthN)

AuthN is handled by `requireAuthentication(event)`, which dispatches to the appropriate auth mechanism based on what credentials are present.

### Dispatch Order

If workflow auth headers (`Authorization: Bearer` + `X-Workflow-Run-UUID`) are present, the **task path runs exclusively**. If task auth fails, the request is rejected — it does **not** fall through to user auth. This prevents identity blending (a task pretending to be a user on failure).

If no workflow headers are present, the user auth path runs.

### User Auth Path

- Checks for user session (TODO: replace with `nuxt-auth-utils` module)
- Sets `event.context.userId` and `event.context.securityPrincipal`

### Workflow Auth Path

Tasks send three headers with every API request:

```
Authorization: Bearer <callbackToken>
X-Workflow-Run-UUID: <runUuid>
X-Task-Id: <taskId>
```

Verification steps:
1. Extract token, runUuid, and taskId from headers
2. Look up workflow run by UUID (joins upload and receipt records)
3. **Expiry check**: reject if `now > workflowRun.createdAt + WORKFLOW_TOKEN_EXPIRY_MINUTES`
4. **Task ID validation**: look up task's allowed actions from `TASK_PERMISSIONS` map — reject unknown task IDs
5. **HMAC verification**: recompute token from known DB values using the same scope + actions, compare with `crypto.timingSafeEqual`
6. Set `event.context.workflowRun`, `event.context.taskId`, `event.context.taskActions`, and `event.context.securityPrincipal`

If neither auth path succeeds, the request is rejected with 401.

All AuthN failures are logged to the `security` domain with IP, user-agent, method, and path.

## Authorization (AuthZ)

AuthZ is handled by `requireAuthorization(event, { uploadHashId?, receiptId?, splitId? })`, called after AuthN in every protected handler that operates on a specific resource.

### User AuthZ

- Verifies the resource's `userId` field matches `event.context.userId`
- Returns **404** on mismatch — do not reveal resource existence to unauthorized users
- Future: will check household/shared permissions here

### Task AuthZ (Resource Scope)

- Verifies the requested resource belongs to this workflow run's linked resources
- `uploadHashId`: must match `workflowRun.upload.hashId`
- `receiptId`: must match `workflowRun.upload.receiptId`
- `splitId`: must match the receipt's linked splitId (via join through receipt → split)
- Returns **403** on mismatch — tasks know their own scope, no need to hide resource existence

### Task AuthZ (Action Permissions)

After AuthN, `requireTaskPermission(event)` checks that the calling task has permission for the specific endpoint operation:

1. Derives `resource` from the route path (`/api/receipts/...` → `receipt`)
2. Derives `permission` from the HTTP method (`GET` → `read`, `POST`/`PUT` → `write`, `DELETE` → `delete`)
3. Checks `resource:permission` is in `event.context.taskActions`
4. Throws 403 if not permitted

This is a no-op for user requests (users are not subject to task permissions).

All AuthZ failures are logged to the `security` domain with the specific reason, IP, user-agent, method, and path.

## HMAC Token Mechanism

### Generation

Tokens are generated server-side when a user triggers a workflow (`POST /api/workflows/:uploadHashId`). The orchestrator then generates per-task tokens for each child task.

```
HMAC-SHA256(
  key = WORKFLOW_CALLBACK_SALT,
  input = "${runUuid}|${runCreatedAt}|${scope}|${sortedActions}"
)
```

- `|` (pipe) is the field separator — allows `:` in scope and action values
- `sortedActions` is the task's permissions sorted alphabetically and joined with `,`
- Both `scope` and `actions` are required — generating a token without either throws an error

The token is deterministic — same inputs always produce the same hash. This means the token is valid for retries of the same operation.

### Action-Scoped Permissions

Each task has a defined set of allowed `resource:permission` pairs in `shared/config/task-permissions.js`:

```js
TASK_PERMISSIONS = {
  'receipt-workflow': ['workflow:read', 'workflow:write'],
  'analyze-ocr': ['receipt:read', 'receipt:write', 'upload:read', 'upload:write', 'workflow:read', 'workflow:write'],
  'analyze-annotations': ['upload:read', 'upload:write', 'workflow:read', 'workflow:write'],
  'create-split': ['receipt:read', 'receipt:write', 'split:write', 'workflow:read', 'workflow:write'],
}
```

The orchestrator generates a unique token per child task by including that task's actions in the HMAC input. The server reconstructs the expected actions from the `X-Task-Id` header + the permissions map. No extra headers needed.

This means `analyze-annotations` literally cannot create a split — its token won't verify against an endpoint that requires `split:write`.

### Scope

The `scope` parameter binds the token to a specific resource. It is **required** — generating a token without a scope throws an error.

Scope format: `upload:<hashId>` (e.g., `upload:abc123`)

The scope is derived from the workflow run's linked upload. A token scoped to one upload cannot be used to access a different resource — the HMAC will not match.

### Properties

| Property | Value |
|:--|:--|
| Algorithm | HMAC-SHA256 |
| Output | 64-character hex string |
| Field separator | `\|` (pipe) — allows `:` in scope values |
| Scoped to | A single workflow run + resource + task actions (`runUuid + createdAt + scope + actions`) |
| Expiry | `WORKFLOW_TOKEN_EXPIRY_MINUTES` (default 15 min) from `workflowRun.createdAt` |
| Comparison | `crypto.timingSafeEqual` (prevents timing side-channel attacks) |
| Secret | `WORKFLOW_CALLBACK_SALT` env var (server-side only) |
| Scope required | Yes — generating without scope or actions throws an error |

### Token Scoping Philosophy

Tokens must be as granular as possible. The goal is that a token **cannot be reused for anything other than a retry** of the exact same operation.

Scoping layers:
1. **Action scope**: token encodes the task's allowed `resource:permission` pairs — `requireTaskPermission` enforces this per endpoint
2. **Resource scope**: token is bound to a specific workflow run and resource (e.g., `upload:abc123`) — `requireAuthorization` verifies resource ownership
3. **Time scope**: token expires after `WORKFLOW_TOKEN_EXPIRY_MINUTES` (default 15 min)

### Token Lifecycle

```
1. User uploads receipt
2. User triggers workflow → POST /api/workflows/:uploadHashId
3. Server creates workflow_runs row (UUID, createdAt)
4. Server generates orchestrator token with scope + orchestrator actions
5. Server triggers Trigger.dev orchestrator with { callbackToken, runUuid, runCreatedAt, scope }
6. Orchestrator generates per-task tokens (each with task-specific actions from TASK_PERMISSIONS)
7. Each child task receives its own unique token
8. Tasks use their token as Bearer auth for API calls
9. Server verifies token by reconstructing HMAC from DB values + scope + task actions
10. Server checks requested operation is in the task's permission set
11. Token expires ~15 min after workflow run creation
```

## Security Logging

All security events are logged via `logSecurityEvent(event, level, context, message)` to the `security` domain. Every log entry includes:

- `ip` — client IP (supports `X-Forwarded-For`)
- `userAgent` — request user-agent header
- `method` — HTTP method
- `path` — request path
- Plus caller-specific context (e.g., `runUuid`, `taskId`, `reason`)

## Static Analysis Tests

Integration tests in `tests/integration/security-boundaries.test.js` enforce:

1. **No direct DB access in trigger tasks** — no `server/db/connection`, `useDB`, or `drizzle-orm` imports in `trigger/**/*.js`
2. **No legacy auth** — no `requireUserId` calls in any API endpoint
3. **AuthZ on resource endpoints** — every `[id]`/`[hashId]` endpoint calls `requireAuthorization`
4. **Correct AuthZ parameters** — receipt endpoints pass `receiptId`, split endpoints pass `splitId`, upload endpoints pass `uploadHashId`
5. **Task permission enforcement** — all task-facing endpoints call `requireTaskPermission`
6. **Permissions map coverage** — every task ID found in trigger files has an entry in `TASK_PERMISSIONS`
7. **Valid action format** — all entries in `TASK_PERMISSIONS` use valid `resource:permission` format

These are regex-based and can be bypassed by commented-out code (documented in test file).

## Environment Variables

| Variable | Purpose |
|:--|:--|
| `WORKFLOW_CALLBACK_SALT` | Secret key for HMAC token generation/verification |
| `WORKFLOW_TOKEN_EXPIRY_MINUTES` | Token validity window (default: 15 minutes) |

## Future Improvements

- **Household permissions**: User AuthZ currently checks `userId` ownership. Multi-user households will need permission-based access (read, write, admin) on a parent resource.
- **`nuxt-auth-utils`**: Replace hardcoded dev user with proper session-based authentication.
- **Generic workflow trigger**: Current trigger endpoint uses `[uploadHashId]` — won't scale for receipt-triggered or other non-upload workflows.
