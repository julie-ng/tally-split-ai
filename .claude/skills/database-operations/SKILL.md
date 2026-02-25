---
name: database-operations
description: Database workflows for this project — schema changes, migrations, and seed scripts using Drizzle ORM + SQLite. Use when the user asks to add a table, modify a schema, create a migration, or seed the database.
---

# Database Operations

## Key Locations

| Item | Path |
|:--|:--|
| Schema | `server/db/schema.ts` |
| DB file | `.data/db/sqlite.db` (NOT `./data/`) |
| Migrations | `server/db/migrations/` |
| Seed files | `server/db/seed-*.js` |

## Current Tables

- `uploads` — Azure Blob metadata (hashId, blobPath, contentType, azureTags, etc.)
- `receipts` — Receipt business data (merchant, total, date, analysisStatus, etc.)
- `splits` — Expense split records (receiptId, amount, person, settled, etc.)

## Adding/Changing Schema

1. Edit `server/db/schema.ts`
2. Generate migration: `npx nuxt db generate`
3. Apply migration: `npx nuxt db migrate`

> **Never** use `npx drizzle-kit ...` commands — use the Nuxt-specific commands above.

## Seed Scripts

Because Drizzle + Nuxt use TypeScript, use `npx tsx` to run seed files (not `node`):

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

```js
import { db, schema } from 'hub:db'
import { eq, sql } from 'drizzle-orm'

// Select
const rows = await db.select().from(schema.receipts).where(eq(schema.receipts.id, id))

// Insert
const result = await db.insert(schema.receipts).values({ ... }).returning()

// Update
const result = await db.update(schema.receipts).set({ updatedAt: sql`(unixepoch())` }).where(eq(schema.receipts.id, id)).returning()

// Delete
await db.delete(schema.receipts).where(eq(schema.receipts.id, id))
```

SQLite note: complex fields (e.g., JSON objects) must be serialized: `JSON.stringify(value)` before storing, `JSON.parse(value)` after reading.
