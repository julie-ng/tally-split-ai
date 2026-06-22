# Database Workflow

Day-to-day commands for schema changes, migrations, backfills, and seeds.

- Schema reference (tables, columns, enums): [SCHEMA.md](./SCHEMA.md)
- Connection setup & rationale: [ARCHITECTURE.md → Database](../ARCHITECTURE.md#database)

## Stack

- PostgreSQL + Drizzle ORM, `postgres` (postgres-js) driver
- Local Postgres: `docker compose -f docker-compose.dev.yaml up -d`

## Drizzle config

One config — `drizzle.config.ts` — reads `NUXT_DATABASE_URL` for every target. The target database (local Docker / Supabase dev / Supabase prod) is selected by the environment the command runs under (e.g. injected via password management tool), not by a flag or a separate config.

## Commands

```bash
npm run db:generate               # schema.ts change → migration SQL
npm run db:migrate                # apply (target = whichever NUXT_DATABASE_URL is injected)
npm run db:studio                 # inspect (refresh after migrating — it caches schema)
```

## Adding a NOT NULL column to a populated table

`ADD COLUMN ... NOT NULL` fails on existing rows. Three passes:

1. Add **nullable** (omit `.notNull()`) → generate → migrate
2. Backfill every row → confirm `Skipped: 0`
3. Re-add `.notNull()` → generate → migrate

Backfill each environment before applying step 3 there.

## Seeds vs. backfills

| | `server/db/seeds/` | `server/db/migrations/backfills/` |
|:--|:--|:--|
| Purpose | Maintained bootstrap data | One-time historical migrations |
| Example | `seed-first-user.js` | `seed-split-household-ids.js` |

For a new script, copy the pattern in `server/db/migrations/backfills/seed-split-household-ids.js`. Run with `npx tsx <path>`.

## See also

- DB error codes: [ERRORS.md](./ERRORS.md#db-code-values-postgres-js)
- Deploy / pooler URLs: [DEPLOYMENT.md → Database/Supabase](./DEPLOYMENT.md#databasesupabase)
