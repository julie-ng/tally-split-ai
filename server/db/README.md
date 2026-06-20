# `server/db`

## Documentation

Docs are maintained elsewhere:

- [docs/SCHEMA.md](../../docs/SCHEMA.md) — schema reference (tables, columns, enums)
- [docs/DATABASE.md](../../docs/DATABASE.md) — migration / backfill / seed workflow
- [docs/DEPLOYMENT.md → Migrations](../../docs/DEPLOYMENT.md#migrations) — running migrations against dev / prod
- [ARCHITECTURE.md → Database](../../ARCHITECTURE.md#database) — connection setup & rationale

## Directory Structure

- `schema.ts` — Drizzle schema
- `connection.ts` — runtime DB client
- `migrations/postgres/` — generated migrations + `meta/` journal
- `migrations/backfills/` — one-time historical migrations
- `seeds/` — maintained bootstrap data
