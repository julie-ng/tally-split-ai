---
name: database-operations
description: Database workflows for this project — schema changes, migrations, and seed scripts using Drizzle ORM + PostgreSQL. Use when the user asks to add a table, modify a schema, create a migration, or seed the database.
---

# Database Operations

## Key Locations

| Item | Path |
|:--|:--|
| Schema | `server/db/schema.ts` |
| DB connection | `server/db/connection.ts` |
| Migrations | `server/db/migrations/postgres/` |
| Seed files | `server/db/seed-*.js` |

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

## Seed Scripts

Use `npx tsx` to run seed files:

```bash
npx tsx ./server/db/seed-receipts.js
```

Existing seed files:
- `seed-receipts.js` — Receipt data
- `seed-splits.js` — Split records
- `seed-receipt-titles.js` — Receipt title updates
- `seed-receipt-analysis-statuses.js` — Analysis status seeding
- `seed-receipt-split-ids.js` — Link receipts to splits

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
