---
paths:
  - "server/db/**"
---

# Database Timestamps

**Instants (when something happened) → `timestamptz` (`withTimezone: true`).**
Plain `timestamp` only for a true TZ-independent wall-clock (rare). `timestamptz`
stores UTC and round-trips correctly; plain `timestamp` discards the offset — a
latent bug that only bites once a server/connection isn't UTC.

```ts
completedAt: timestamp('completed_at', { withTimezone: true }),  // ✅ instant
```

**Existing naive columns are historical, not a pattern** — some older tables use
plain `timestamp`. Don't copy them, but don't convert populated ones either
(reinterprets stored values → needs a backfill). Empty columns are free to fix.
