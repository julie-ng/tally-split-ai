---
name: add-api-endpoint
description: Step-by-step guide to create a new Nuxt server API endpoint following project conventions. Use when adding a new route, resource, or HTTP method to server/api/.
---

# Add a New API Endpoint

## 1. Create the File

Files in `server/api/` are auto-registered as routes by Nuxt:

| File | Route |
|:--|:--|
| `server/api/widgets/index.get.js` | `GET /api/widgets` |
| `server/api/widgets/index.post.js` | `POST /api/widgets` |
| `server/api/widgets/[id].get.js` | `GET /api/widgets/:id` |
| `server/api/widgets/[id].put.js` | `PUT /api/widgets/:id` |
| `server/api/widgets/[id].delete.js` | `DELETE /api/widgets/:id` |

## 2. Use the Standard Handler Template

```js
import { z } from 'zod'
import { db, schema } from 'hub:db'
import { eq, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireUserId(event)           // validates auth — always first
  requireHashIdParam(event)      // use requireIdParam() for numeric IDs

  const hashId = getRouterParam(event, 'hashId')

  // For POST/PUT: validate body with zod
  const result = await readValidatedBody(event, body => zodSchemas.mySchema.safeParse(body))
  if (!result.success) {
    setResponseStatus(event, 400)
    return {
      success: false,
      message: 'Invalid request body',
      errors: z.flattenError(result.error).fieldErrors,
    }
  }

  // Drizzle query
  const dbResult = await db
    .update(schema.myTable)
    .set({ ...result.data, updatedAt: sql`(unixepoch())` })
    .where(eq(schema.myTable.hashId, hashId))
    .returning()

  if (dbResult.length === 0) {
    throw createError({ statusCode: 404, message: 'Not found' })
  }

  return { success: true, data: dbResult[0] }
})
```

Reference: `server/api/uploads/[hashId].put.js`

## 3. Add a Zod Schema (if new data shape needed)

1. Create schema in `shared/utils/zod-schemas/my-resource.schema.js`
2. Export it from `shared/utils/zod-schemas/index.js` as `zodSchemas.mySchema`

## 4. SQLite Gotchas

- Serialize complex fields before storing: `JSON.stringify(updates.azureTags)`
- Always add `updatedAt: sql\`(unixepoch())\`` on updates

## 5. Response Shape Convention

```js
// Success
return { success: true, data: dbResult[0] }     // single item
return { success: true, data: dbResults }         // list

// Validation error (400 — don't throw, return)
return { success: false, message: '...', errors: { field: ['message'] } }

// Not found (throw)
throw createError({ statusCode: 404, message: '...' })
```
