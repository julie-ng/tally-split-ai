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

## Hand-written migrations (RLS, grants, publications, views)

Some DDL can't be generated from `schema.ts` — RLS policies, `GRANT`s, publication membership, and views. Drizzle's introspection doesn't model them, so `db:generate` will never emit them. You author the `.sql` by hand.

Examples: [`0017_realtime_workflow_runs_rls.sql`](../server/db/migrations/postgres/0017_realtime_workflow_runs_rls.sql), [`0018_household_scoped_workflow_runs_rls.sql`](../server/db/migrations/postgres/0018_household_scoped_workflow_runs_rls.sql).

Steps:

1. **Write the `.sql`** in `server/db/migrations/postgres/` — next number, descriptive name (e.g. `0018_household_scoped_workflow_runs_rls.sql`).
2. **Add a row to `meta/_journal.json`** — this is the step `db:generate` normally does for you. Copy the previous entry and bump it:
   ```json
   { "idx": 18, "version": "7", "when": <now-unix-ms>, "tag": "0018_household_scoped_workflow_runs_rls", "breakpoints": true }
   ```
   - `idx` = previous + 1. `tag` = filename without `.sql` (this links the row to the file). `when` = current Unix **ms** (`node -e "console.log(Date.now())"`), and must be **greater than** the previous row's `when` so ordering holds.
   - **No snapshot needed.** RLS/grants/publications aren't in Drizzle's snapshot model, so there's no `meta/00XX_snapshot.json` — expected (`0017`/`0018` have none).
3. **Apply** — `npm run db:migrate`.

> [!CAUTION]
> `db:migrate` reads `_journal.json`, not the folder. If you write the `.sql` but forget the journal row, migrate reports **success and applies nothing** — the phantom-applied trap. Verify the change actually landed (e.g. `SELECT polname FROM pg_policy WHERE ...`), not just that migrate exited 0.

Make statements **idempotent** so a re-run (or a manual apply on an existing env) is safe: `GRANT`s are naturally idempotent; guard `CREATE POLICY` with `DROP POLICY IF EXISTS` or a `DO $$ ... EXCEPTION WHEN duplicate_object THEN null; END $$` block; check publication membership before `ALTER PUBLICATION ADD TABLE`. See `0017` for the patterns.

## Seeds vs. backfills

| | `server/db/seeds/` | `server/db/migrations/backfills/` |
|:--|:--|:--|
| Purpose | Maintained bootstrap data | One-time historical migrations |
| Example | `seed-first-user.js` | `seed-split-household-ids.js` |

For a new script, copy the pattern in `server/db/migrations/backfills/seed-split-household-ids.js`. Run with `npx tsx <path>`.

## See also

- DB error codes: [ERRORS.md](./ERRORS.md#db-code-values-postgres-js)
- Deploy / pooler URLs: [DEPLOYMENT.md → Database/Supabase](./DEPLOYMENT.md#databasesupabase)
