# Security Model

This document describes the authentication and authorization architecture for the application, including how human users and headless agents (Trigger.dev tasks) authenticate and what they are authorized to access.

## Principals

There are two types of principals in this system. They are always separate and never share identity or auth paths.

### Human Principals (Users)

Human users authenticate via session (currently `local-dev-user` for local development). The session establishes `event.context.userId`, which is used for ownership-based authorization checks.

### Service Principals (Tasks)

Trigger.dev tasks are headless agents that process receipts. They authenticate via HMAC tokens scoped to a specific workflow run and resource. A task never authenticates as a user — it authenticates as itself. The token establishes `event.context.workflowRun` and `event.context.taskId`.

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
2. Look up workflow run by UUID (joins upload record)
3. **Expiry check**: reject if `now > workflowRun.createdAt + WORKFLOW_TOKEN_EXPIRY_MINUTES`
4. **HMAC verification**: recompute token from known DB values using the same scope, compare with `crypto.timingSafeEqual`
5. Set `event.context.workflowRun`, `event.context.taskId`, and `event.context.securityPrincipal`

If neither auth path succeeds, the request is rejected with 401.

All AuthN failures are logged to the `security` domain with IP, user-agent, method, and path.

## Authorization (AuthZ)

AuthZ is handled by `requireAuthorization(event, { uploadHashId?, receiptId?, splitId? })`, called after AuthN in every protected handler that operates on a specific resource.

### User AuthZ

- Verifies the resource's `userId` field matches `event.context.userId`
- Returns **404** on mismatch — do not reveal resource existence to unauthorized users
- Future: will check household/shared permissions here

### Task AuthZ (Resource Scope)

- Verifies the requested resource belongs to this workflow run's upload
- `uploadHashId`: must match `workflowRun.upload.hashId`
- `receiptId`: must match `workflowRun.upload.receiptId` (via join)
- `splitId`: must match the receipt's linked splitId (via join through upload → receipt → split)
- Returns **403** on mismatch — tasks know their own scope, no need to hide resource existence

All AuthZ failures are logged to the `security` domain with the specific reason, IP, user-agent, method, and path.

## HMAC Token Mechanism

### Generation

Tokens are generated server-side when a user triggers a workflow (`POST /api/workflows/:uploadHashId`).

```
HMAC-SHA256(
  key = WORKFLOW_CALLBACK_SALT,
  input = "${runUuid}|${runCreatedAt}|${scope}"
)
```

The `|` (pipe) character is used as the field separator so that scope values can use `:` freely (e.g., `upload:abc123`, `receipt:123`).

The token is deterministic — same inputs always produce the same hash. This means the token is valid for retries of the same operation.

### Scope

The `scope` parameter binds the token to a specific resource. It is **required** — generating a token without a scope throws an error.

Current scope format:
- Upload-triggered workflows: `upload:<hashId>` (e.g., `upload:abc123`)
- Future receipt-triggered workflows: `receipt:<id>` (e.g., `receipt:123`)

The scope is verified during token validation by reconstructing it from the workflow run's known data (e.g., `upload:${workflowRun.upload.hashId}`). A token scoped to one resource cannot be used to access a different resource — the HMAC will not match.

### Properties

| Property | Value |
|:--|:--|
| Algorithm | HMAC-SHA256 |
| Output | 64-character hex string |
| Field separator | `\|` (pipe) — allows `:` in scope values |
| Scoped to | A single workflow run + specific resource (`runUuid + createdAt + scope`) |
| Expiry | `WORKFLOW_TOKEN_EXPIRY_MINUTES` (default 15 min) from `workflowRun.createdAt` |
| Comparison | `crypto.timingSafeEqual` (prevents timing side-channel attacks) |
| Secret | `WORKFLOW_CALLBACK_SALT` env var (server-side only) |
| Scope required | Yes — generating without scope throws an error |

### Token Scoping Philosophy

Tokens must be as granular as possible. The goal is that a token **cannot be reused for anything other than a retry** of the exact same operation.

Scoping layers:
1. **HMAC scope**: token is bound to a specific workflow run and resource (e.g., `upload:abc123`)
2. **AuthZ scope**: `requireAuthorization` verifies the requested resource ID matches the workflow run's known resources
3. **Time scope**: token expires after `WORKFLOW_TOKEN_EXPIRY_MINUTES` (default 15 min)

### Token Lifecycle

```
1. User uploads receipt
2. User triggers workflow → POST /api/workflows/:uploadHashId
3. Server creates workflow_runs row (UUID, createdAt)
4. Server generates HMAC token with scope "upload:<hashId>"
5. Server triggers Trigger.dev task with { callbackToken, runUuid }
6. Orchestrator passes token to child tasks
7. Tasks use token as Bearer auth for API calls
8. Server verifies token by reconstructing HMAC from DB values + scope
9. Token expires ~15 min after workflow run creation
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

1. **No direct DB access in trigger tasks** — no `server/db/connection`, `useDB`, or `drizzle-orm` imports
2. **No legacy auth** — no `requireUserId` calls in any API endpoint
3. **AuthZ on resource endpoints** — every `[id]`/`[hashId]` endpoint calls `requireAuthorization`
4. **Correct AuthZ parameters** — receipt endpoints pass `receiptId`, split endpoints pass `splitId`, upload endpoints pass `uploadHashId`

These are regex-based and can be bypassed by commented-out code (documented in test file).

## Environment Variables

| Variable | Purpose |
|:--|:--|
| `WORKFLOW_CALLBACK_SALT` | Secret key for HMAC token generation/verification |
| `WORKFLOW_TOKEN_EXPIRY_MINUTES` | Token validity window (default: 15 minutes) |

## Future Improvements

- **Action-scoped tokens**: Add `action` to HMAC input so the token is scoped to a specific operation (e.g., "create receipt"), not just a workflow run. This prevents a token intended for one step from being used in another.
- **`receiptId` in workflowRuns**: Currently workflows are always triggered by uploads. Future workflows may be receipt-specific (e.g., "re-analyze receipt"). Adding `receiptId` to `workflowRuns` enables direct receipt scope validation without joining through upload.
- **Household permissions**: User AuthZ currently checks `userId` ownership. Multi-user households will need permission-based access (read, write, admin) on a parent resource.
- **`nuxt-auth-utils`**: Replace hardcoded dev user with proper session-based authentication.
