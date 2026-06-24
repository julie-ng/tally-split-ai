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

## The rules that bite if ignored

- **Stores must not reference each other** — keep them independent. Cross-store coordination belongs to the page/component, not the store.
- **Stores validate via zod before sending to backend** — not components (`.claude/rules/zod-validation.md`).
- **Optimistic updates must snapshot the original for rollback** — apply the change to cache immediately, restore the snapshot on API failure. Skipping the snapshot means a failed PUT leaves stale optimistic data.
- **Import stores explicitly** even though auto-import is configured (project convention).
