# Security Model

This document describes the authentication and authorization architecture for the application, including how human users and headless agents (Trigger.dev tasks) authenticate and what they are authorized to access.

## Principals

There are two types of principals in this system. They are always separate and never share identity or auth paths.

### Human Principals (Users)

Human users authenticate via session (currently `local-dev-user` for local development). The session establishes `event.context.userId`, which is used for ownership-based authorization checks.

### Service Principals (Tasks)

Trigger.dev tasks are headless agents that process receipts. They authenticate via HMAC tokens scoped to a specific workflow run. A task never authenticates as a user — it authenticates as itself. The token establishes `event.context.workflowRun` and `event.context.taskId`.

> [!IMPORTANT]
> A task must never be granted a `userId` or act "on behalf of" a user. The principal types are analogous to Azure's user principals vs. service principals — same platform, fully separate identity types.

## Authentication (AuthN)

AuthN is handled by `requireAuthentication(event)`, which dispatches to the appropriate auth mechanism based on what credentials are present.

### User Auth Path

- Checks for user session
- Sets `event.context.userId`
- If no session found, falls through to workflow auth

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
4. **HMAC verification**: recompute token from known DB values, compare with `crypto.timingSafeEqual`
5. Set `event.context.workflowRun` and `event.context.taskId`

If neither auth path succeeds, the request is rejected with 401.

All AuthN failures are logged to the `security` domain.

## Authorization (AuthZ)

AuthZ is handled by `requireAuthorization(event, { uploadHashId?, receiptId?, splitId? })`, called after AuthN in every protected handler.

### User AuthZ

- Verifies the resource's `userId` field matches `event.context.userId`
- Future: will check household/shared permissions here

### Task AuthZ (Resource Scope)

- Verifies the requested resource belongs to this workflow run's upload
- `uploadHashId`: must match `workflowRun.upload.hashId`
- `receiptId`: must match `workflowRun.upload.receiptId` (via join)
- `splitId`: must match the receipt's linked splitId (via join through upload -> receipt)

All AuthZ failures are logged to the `security` domain with the specific reason.

## HMAC Token Mechanism

### Generation

Tokens are generated server-side when a user triggers a workflow (`POST /api/workflows/:uploadHashId`).

```
HMAC-SHA256(
  key = WORKFLOW_CALLBACK_SALT,
  input = "${runUuid}:${runCreatedAt}:${blobUrl}"
)
```

The token is deterministic — same inputs always produce the same hash. This means the token is valid for retries of the same operation.

### Properties

| Property | Value |
|:--|:--|
| Algorithm | HMAC-SHA256 |
| Output | 64-character hex string |
| Scoped to | A single workflow run (UUID + createdAt + blobUrl) |
| Expiry | `WORKFLOW_TOKEN_EXPIRY_MINUTES` (default 15 min) from `workflowRun.createdAt` |
| Comparison | `crypto.timingSafeEqual` (prevents timing side-channel attacks) |
| Secret | `WORKFLOW_CALLBACK_SALT` env var (server-side only) |

### Token Scoping Philosophy

Tokens must be as granular as possible. The goal is that a token **cannot be reused for anything other than a retry** of the exact same operation.

Current scoping:
- Bound to a specific workflow run (UUID + createdAt + blobUrl)
- Resources validated via AuthZ (must belong to this workflow run's upload)
- Time-limited via expiry check

### Token Lifecycle

```
1. User uploads receipt
2. User triggers workflow → POST /api/workflows/:uploadHashId
3. Server creates workflow_runs row (UUID, createdAt)
4. Server generates HMAC token from run metadata
5. Server triggers Trigger.dev task with { callbackToken, runUuid }
6. Orchestrator passes token to child tasks
7. Tasks use token as Bearer auth for API calls
8. Token expires ~15 min after workflow run creation
```

## Environment Variables

| Variable | Purpose |
|:--|:--|
| `WORKFLOW_CALLBACK_SALT` | Secret key for HMAC token generation/verification |
| `WORKFLOW_TOKEN_EXPIRY_MINUTES` | Token validity window (default: 15 minutes) |

## Future Improvements

- **Action-scoped tokens**: Add `action` to HMAC input so the token is scoped to a specific operation (e.g., "create receipt"), not just a workflow run. This prevents a token intended for one step from being used in another.
- **`receiptId` in workflowRuns**: Currently workflows are always triggered by uploads. Future workflows may be receipt-specific (e.g., "re-analyze receipt"). Adding `receiptId` to `workflowRuns` enables direct receipt scope validation without joining through upload.
- **Household permissions**: User AuthZ currently checks `userId` ownership. Multi-user households will need permission-based access (read, write, admin) on a parent resource.
