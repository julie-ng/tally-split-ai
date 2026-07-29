---
paths:
  - "server/db/**"
---

# Database Timestamps

**Instants (when something happened) → `timestamptz` (`withTimezone: true`).**
Plain `timestamp` only for a true TZ-independent wall-clock (rare). `timestamptz`
stores UTC and round-trips correctly; plain `timestamp` discards the offset.

```ts
completedAt: timestamp('completed_at', { withTimezone: true }),  // ✅ instant
```

**Every timestamp in this schema is timestamptz** (mig 0028 converted the last 12).
There are no naive columns left — if you're adding one, you're introducing the bug.

**It bites the BROWSER, not just the server.** The earlier version of this rule said
naive columns were a latent bug "only once a server/connection isn't UTC" — and that
the populated ones should be left alone. Both were wrong in practice: the DB and
server were UTC the whole time, but the *client* isn't. A naive value arrives with no
offset, so the browser reads the digits as LOCAL time — a just-created upload
rendered "2 hours ago" in Berlin (UTC+2).

Converting was safe precisely because everything was already UTC:
`ALTER COLUMN x TYPE timestamptz USING x AT TIME ZONE 'UTC'` reinterprets the same
digits rather than shifting them. Confirm the server's zone (`SELECT now()::timestamp`)
before assuming that of any future column.

⚠️ A view that selects the column blocks the ALTER — drop and recreate it in the same
migration (0028 does this for `v_expense_metrics`).
