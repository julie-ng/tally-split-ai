---
name: vue-components
description: Vue component conventions, structure, and patterns for this project. Use when creating or modifying Vue components in app/components/.
---

# Vue Components

## 1. File - Directory Placement

Components are organized by feature domain in `app/components/`:

| Directory | Components for |
|:--|:--|
| `receipt/` | Receipt display, editing, analysis |
| `upload/` | Single upload detail view |
| `uploads/` | Upload queue, list views |
| `blob/` | Blob metadata display |
| `bulk-analyze/` | Bulk analysis UI |
| `split/` | Individual split records |
| `splits/` | Split management, summaries |
| `ui/` | Generic reusable UI helpers |
| `analysis/` | Analysis result display |
| `data/` | Data display utilities |

## 2. File - Naming

- Kebab-case, multi-word, `.vue` extension
- ✅ `receipt/edit-form.vue`, `blob/sas-link.vue`
- ❌ `ReceiptEdit.vue`, `BlobSasLink.vue`

## 3. Component Template

```vue
<script setup>
// Props — use zod for validation, not defineProps type checks
const props = defineProps(['receiptId'])

// Two-way binding — use defineModel(), not manual emit/prop
const model = defineModel()

// Store access
const receiptsStore = useReceiptsStore()

// Computed / data
const receipt = computed(() => receiptsStore.getReceiptById(props.receiptId))
</script>

<template>
  <div>
    <!-- Display errors from store, don't validate here -->
    <p v-if="receiptsStore.error">{{ receiptsStore.error }}</p>
  </div>
</template>
```

## 4. Key Rules

- **`defineModel()`** for v-model two-way bindings — never manually wire emits + props
- **Do NOT validate** inputs in the component (no type checks, no null guards)
- **Do NOT prevent** empty/null values from reaching Pinia — the store handles validation
- Components are **only responsible for displaying errors** surfaced by the store
- Attributes on components use kebab-case: `<my-component my-prop="value" />`
- Avoid directly fetching data from APIs from components, e.g. via `useFetch()` and `$fetch()`. Instead, use the appropriate Pinia store to read/update/delete data.

## 5. Reference Components

- `app/components/receipt/edit-form.vue` — form with store interaction
- `app/components/blob/sas-link.vue` — simple display with SAS URL
- `app/components/upload/overview.vue` — `<ClientOnly>` usage
