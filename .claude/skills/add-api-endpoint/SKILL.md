---
name: add-api-endpoint
description: Step-by-step guide to create a new Nuxt server API endpoint following project conventions. Use when adding a new route, resource, or HTTP method to server/api/.
---

# Add a New API Endpoint

The handler shape, error handling, and response conventions are in the always-loaded rule `.claude/rules/server-api-patterns.md` — follow it. Reference implementation: `server/api/uploads/[id].put.js`. This skill only adds what that rule doesn't.

## Steps

1. **Create the file** under `server/api/` — Nitro auto-registers it as a route. `[id].get.js` → `GET /api/resource/:id`, `index.post.js` → `POST /api/resource`, etc.
2. **Guards at the top, in order:** `requireAuthentication` → `requireIdParam` → `requireAuthorization`. See an existing handler.
3. **Validate bodies/params with zod**, never by hand — see `.claude/rules/zod-validation.md`. Add a new schema in `shared/utils/zod-schemas/` and export it from that dir's `index.js`.
4. **Mutations:** if a task can call this endpoint, add `requireTaskPermission` and confirm the resource scope in `shared/config/task-permissions.js`. PUT/POST should return an acknowledgment, **not** the full row (a write-scoped token must not gain an incidental read).

## Why these aren't obvious

- **IDs are random strings** (`#shared/utils/generate-id.js`), addressed via `[id]`. There is **no `hashId`** — an older deterministic scheme was removed. Use `requireIdParam` / `getRouterParam(event, 'id')`.
- **`updatedAt` must be set manually** on updates — the schema only defaults it on insert; Postgres has no auto-update trigger.
- **`jsonb` columns** (e.g. `ocrJson`) take plain JS objects — never `JSON.stringify`.
