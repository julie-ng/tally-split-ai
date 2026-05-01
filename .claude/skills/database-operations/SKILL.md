---
name: database-operations
description: Database workflows for this project — schema changes and migrations using Drizzle ORM + PostgreSQL. Use when the user asks to add a table, modify a schema, or create a migration.
---

# Database Operations

## Key Locations

| Item | Path |
|:--|:--|
| Schema | `server/db/schema.ts` |
| DB connection | `server/db/connection.ts` |
| Migrations | `server/db/migrations/postgres/` |
| Backfill scripts | `server/db/migrations/backfills/` (historical, not maintained) |

## Database

PostgreSQL 17 running in Docker:
```bash
docker compose -f docker-compose.dev.yaml up -d
```

Connection string via env var: `NUXT_DATABASE_URL`

## Current Tables

- `uploads` — Azure Blob metadata (hashId, blobPath, contentType, azureTags as jsonb, etc.)
- `receipts` — Receipt business data (merchant, total, date, analysisStatus, etc.)
- `splits` — Expense split records (receiptId, amount, person, settled, etc.)

## Adding/Changing Schema

1. Edit `server/db/schema.ts`
2. Generate migration: `npm run db:generate`
3. Apply migration: `npm run db:migrate`

## Backfill Scripts

`server/db/migrations/backfills/` holds **historical, time-bound** scripts
(named `seed-*.js`, `migrate-*.js`, etc.) that were run once against past
schema states. They are NOT maintained against the current schema and may
no longer compile — this is expected. Do not update them when changing
the schema.

When a future schema change requires data movement, write a NEW backfill
script in this directory rather than editing existing ones.

## Drizzle Query Patterns

`db` and `schema` are auto-imported in server handlers via `server/utils/db.utils.js`.

```js
export default defineEventHandler(async (event) => {
  const db = useDB()

  // Select
  const rows = await db.select().from(schema.receipts).where(eq(schema.receipts.id, id))

  // Insert
  const result = await db.insert(schema.receipts).values({ ... }).returning()

  // Update
  const result = await db.update(schema.receipts).set({ updatedAt: new Date() }).where(eq(schema.receipts.id, id)).returning()

  // Delete
  await db.delete(schema.receipts).where(eq(schema.receipts.id, id))
})
```

Note: `jsonb` columns (e.g., `azureTags`) accept plain JS objects — do NOT `JSON.stringify`.
