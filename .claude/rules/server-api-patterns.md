---
paths:
  - "server/api/**"
---

# Server API Patterns

## Standard Handler Template

```js
import { z } from 'zod'

export default defineEventHandler(async (event) => {
  const db = useDB()             // auto-imported via server/utils/db.utils.js
  requireUserId(event)           // always first — validates auth
  requireHashIdParam(event)      // or requireIdParam() for numeric IDs

  const hashId = getRouterParam(event, 'hashId')

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

Reference implementation: `server/api/uploads/[hashId].put.js`

## Key Rules

- **No middleware** — use explicit utility functions (`requireUserId`, `requireHashIdParam`) at the top of each handler
- Use `createError()` for all thrown errors (Nuxt-aware, works across server and client)
- Use `setResponseStatus(event, 400)` for validation errors (don't throw — return structured error)
- **Never manually check field types** — use zod schemas (see `rules/zod-validation.md`)
- `schema` is auto-imported — no import needed in handlers
- `jsonb` columns (e.g., `azureTags`) store native JSON — do NOT `JSON.stringify`

## File Naming

Files in `server/api/` are auto-registered as routes:
- `[hashId].get.js` → `GET /api/resource/:hashId`
- `[hashId].put.js` → `PUT /api/resource/:hashId`
- `index.get.js` → `GET /api/resource`
- `index.post.js` → `POST /api/resource`
