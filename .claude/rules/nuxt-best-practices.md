---
paths:
  - "app/**"
---

# Nuxt & Vue Best Practices

## Data Fetching (Hybrid SSR)

### In Pinia stores
- **GET actions:** use `$fetch()` — store manages its own reactive state
- **Mutations (POST/PUT/DELETE):** use `$fetch()` — always user-initiated, client-side only
- **Never** use `useFetch` inside stores — creates competing reactive layers

### In Vue components
- **Fetch data for render:** `await useAsyncData('key', () => store.fetchX())` — runs on server, hydrates to client, no double fetch
- **User actions (click handlers):** call store directly — `store.deleteX(id)` — no wrapper needed
- **Never** call `$fetch()` directly in components — causes double fetch (server + client)

```js
// ✅ Component setup — data for render
await useAsyncData('receipts', () => receiptsStore.fetchAll())

// ✅ Component handler — user action
const handleDelete = () => receiptsStore.deleteReceipt(id)

// ❌ Never — causes double fetch
const data = await $fetch('/api/receipts')
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

Reference: `app/components/Upload/OverviewTabContent.vue`

## Configuration Access

- Public (client-safe) config: `nuxt.config.ts` → `useRuntimeConfig().public.*`
- Private (server-only) config: `nuxt.config.ts` → `useRuntimeConfig().*` (no `.public`)
