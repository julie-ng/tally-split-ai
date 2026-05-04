---
paths:
  - "app/**"
---

# Nuxt & Vue Best Practices

## Data Fetching (Hybrid SSR)

### In Pinia stores

| Action type | Function | Why |
|:--|:--|:--|
| GET (read data) | `$fetch()` | Store manages its own reactive state |
| GET (needs SSR auth cookies) | `useRequestFetch()` | Forwards cookies during SSR. Not needed until `nuxt-auth-utils`. Call in store setup scope. |
| POST/PUT/DELETE (mutation) | `$fetch()` | Always user-initiated, client-side only |
| **Never** | `useFetch()` | Creates competing reactive layers with Pinia |

### In Vue components

| Context | Function | Why |
|:--|:--|:--|
| Setup — fetch data for render | `await useAsyncData('key', () => store.fetchX())` | Runs on server, hydrates to client — no double fetch |
| Setup — global side effect | `await callOnce('key', () => store.doX())` | Runs once during SSR. For config init, analytics — **not data fetching** |
| Handler — user action | `store.deleteX(id)` | Direct call, no wrapper. Mutations are client-side only |
| Component-level data (no store) | `useFetch('/api/...')` | Returns reactive refs. Avoid when a store exists for that data |
| **Never** | `$fetch()` directly | Causes double fetch (server + client). Always use a store or `useAsyncData` |

```js
// ✅ Component setup — data for render
await useAsyncData('receipts', () => receiptsStore.fetchAll())

// ✅ Component handler — user action
const handleDelete = () => receiptsStore.deleteReceipt(id)

// ❌ Never — causes double fetch
const data = await $fetch('/api/receipts')

// ❌ Never — callOnce is not for data fetching
await callOnce('receipts', () => receiptsStore.fetchAll())
```

See `docs/README.md` → "Data Fetching Patterns" for the full reference table.

## Error Handling

Prefer `createError()` over `new Error()` — it works correctly across both server and client contexts:

```js
// ✅ Good
throw createError({ statusCode: 404, message: 'Receipt not found' })

// ❌ Avoid in page/component context
throw new Error('Receipt not found')
```

## Client-Only Content

Wrap content that should not be server-rendered in `<ClientOnly>`:

```html
<ClientOnly>
  <my-component />
</ClientOnly>
```

Reference: `app/components/upload/overview.vue`

## Configuration Access

- Public (client-safe) config: `nuxt.config.ts` → `useRuntimeConfig().public.*`
- Private (server-only) config: `nuxt.config.ts` → `useRuntimeConfig().*` (no `.public`)
