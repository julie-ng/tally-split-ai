---
name: pinia-stores
description: Pinia store conventions and patterns for this project. Use when creating or modifying a store in app/stores/.
---

# Pinia Stores

A store is the single source of truth for one domain (e.g. "receipts") — owns its reactive state, validation, caching, and all API calls for that domain. Components go through stores; they never `$fetch` directly.

Reference (most complete): `app/stores/receipts.store.js`. Data-fetching choices (`$fetch` vs `useAsyncData`) are in `.claude/rules/nuxt-best-practices.md`.

## Conventions

- File: `app/stores/{name}.store.js`. Composition-API style (`defineStore('name', () => {…})`).
- Per-ID maps for state: `loading`/`saving`/`errors` keyed by id, plus an `all` key for list ops.
- Map-based cache `{ [id]: { data, fetchedAt } }` with a TTL (`CACHE_TTL = 300000`).
- Internal helpers prefixed `_` (`_log`, `_isCacheFresh`, `_cacheWidget`).
- Debug logging gated behind a `debug` ref so it toggles per-store without code edits.

## Compose stores in the frontend — don't cross-join domains in the API

Each store owns ONE domain and fetches it from that domain's own endpoint. When a
view needs data from two domains, **compose them in the frontend by id** — warm
each store, read each getter — rather than widening one endpoint to carry another
domain's fields.

- ❌ **Anti-pattern (we did this, then reverted):** the expense preview needed
  merchant name/address (a *receipt* field), so `/api/expenses` was widened to
  join `receipt.merchantName`/`merchantAddress`/`uploads` onto every expense row.
  Now the expenses endpoint leaks receipt-shaped data, the expenses store holds
  fields it doesn't own, and the join cost is paid on every list fetch.
- ✅ **Pattern:** `/api/expenses` returns only the expense (+ `receiptId` so the
  UI knows a receipt exists). The owner (page/composable) warms BOTH stores on
  selection — `expensesStore.fetchExpense(id)` then
  `receiptsStore.fetchReceiptById(expense.receiptId)` — and each leaf reads its
  own store's getter. Lazy/heavy bits (the upload image SAS URL) defer until
  actually needed. Ref: `useExpensePreview()` + `expense/ReceiptTab.vue`.

The test: "does this endpoint return fields a *different* store owns?" If yes,
that's a frontend-composition job, not a join. (A join is fine when the joined
data is genuinely part of the same aggregate — e.g. a receipt WITH its uploads
from `/api/receipts/:id`, because the receipts store owns both.)

## The rules that bite if ignored

- **Stores must not reference each other** — keep them independent. Cross-store coordination belongs to the page/component, not the store. (The composition above is done by the page/composable, NOT by one store importing another.)
- **Stores validate via zod before sending to backend** — not components (`.claude/rules/zod-validation.md`).
- **Optimistic updates must snapshot the original for rollback** — apply the change to cache immediately, restore the snapshot on API failure. Skipping the snapshot means a failed PUT leaves stale optimistic data.
- **Import stores explicitly** even though auto-import is configured (project convention).
