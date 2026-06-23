---
paths:
  - "server/api/**"
---

# Server API Patterns

## Standard Handler Template

```js
import { z } from 'zod'

export default defineEventHandler(async (event) => {
  const db = useDB()                         // auto-imported via server/utils/db.utils.js
  await guards.requireAuthentication(event)  // AuthN — establishes principal (user or task)
  guards.requireIdParam(event)               // validates the :id route param is present
  await guards.requireAuthorization(event, { ... }) // AuthZ — verifies principal can act on resource

  const id = getRouterParam(event, 'id')

  // For POST/PUT: validate request body with zod
  const result = await readValidatedBody(event, body => zodSchemas.mySchema.safeParse(body))
  if (!result.success) {
    setResponseStatus(event, 400)
    return {
      success: false,
      message: 'Invalid request body',
      errors: z.flattenError(result.error).fieldErrors,
    }
  }

  // Drizzle ORM query
  const dbResult = await db.update(schema.myTable).set(result.data).where(...).returning()

  if (dbResult.length === 0) {
    throw createError({ statusCode: 404, message: 'Not found' })
  }

  return { success: true, data: dbResult[0] }
})
```

Reference implementation: `server/api/uploads/[id].put.js`

## Key Rules

- **No middleware** — use explicit utility functions (`guards.requireAuthentication`, `guards.requireAuthorization`, `guards.requireIdParam`) at the top of each handler
- **Guards must not return values** — they should only inspect/extend `event.context` or throw an error. Callers read results from `event.context` (e.g. `event.context.upload`). Reference: https://nuxt.com/docs/4.x/directory-structure/server#server-middleware
- Use `createError()` for all thrown errors (Nuxt-aware, works across server and client)
- Use `setResponseStatus(event, 400)` for validation errors (don't throw — return structured error)
- **Never manually check field types** — use zod schemas (see `rules/zod-validation.md`)
- `schema` is auto-imported — no import needed in handlers
- `jsonb` columns (e.g., `azureTags`) store native JSON — do NOT `JSON.stringify`

## File Naming

Files in `server/api/` are auto-registered as routes:
- `[id].get.js` → `GET /api/resource/:id`
- `[id].put.js` → `PUT /api/resource/:id`
- `index.get.js` → `GET /api/resource`
- `index.post.js` → `POST /api/resource`
