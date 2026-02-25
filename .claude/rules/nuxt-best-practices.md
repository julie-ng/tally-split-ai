---
paths:
  - "app/**"
---

# Nuxt & Vue Best Practices

## Data Fetching (Hybrid SSR)

Use `callOnce()` for data fetches — runs only on the server during SSR, preventing client-side re-fetch and UI flickers:

```js
await callOnce('receipts', async () => {
  await receiptsStore.fetchAll()
}, { mode: 'navigation' })
```

The `{ mode: 'navigation' }` option ensures data re-fetches when the user navigates between pages.

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
