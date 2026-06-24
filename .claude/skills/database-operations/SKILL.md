---
name: database-operations
description: Database workflows for this project — schema changes and migrations using Drizzle ORM + PostgreSQL. Use when adding a table, modifying a schema, or creating a migration.
---

# Database Operations

Schema: `server/db/schema.ts` (source of truth; `docs/SCHEMA.md` documents tables + enums). Connection: `server/db/connection.ts` (postgres-js, `prepare:false` for the transaction pooler). Local DB is Postgres in Docker (`docker compose -f docker-compose.dev.yaml up -d`), URL from `NUXT_DATABASE_URL`.

`db` and `schema` are auto-imported in handlers via `server/utils/db.utils.js`. Standard Drizzle query API — grep any handler for examples.

## Schema change flow

1. Edit `server/db/schema.ts`.
2. `npm run db:generate` (drizzle-kit generate) → review the generated SQL.
3. `npm run db:migrate` (drizzle-kit migrate).

**The agent cannot run these** — no live DB creds (secrets are injected via `op run`, not in the agent's shell). Generate, migrate, seeds, and Studio are hand-offs to the user. For DB inspection, ask the user to look in Drizzle Studio, not psql.

## Gotchas that have cost real time

- **Never hand-edit a migration's `when` timestamp in `meta/_journal.json` after it's been applied** — it silently breaks "what's pending?" comparisons. If varying timestamps *before* running, change the last 3–4 digits too so it doesn't look like a duplicate to a human eyeballing it.
- **Views / non-Drizzle DDL** aren't introspected: hand-write the SQL, copy the snapshot, patch the journal. A view depending on a table you're renaming must be `DROP`ed at the top of that migration and recreated after.
- **Backfills** (`server/db/migrations/backfills/`, `seed-*.js`/`migrate-*.js`) are **historical, time-bound, and NOT maintained** against current schema — they may no longer compile, which is expected. Never update them on a schema change; write a NEW backfill instead. ("Migration" here means schema + code + moving existing data — don't forget the data.)
