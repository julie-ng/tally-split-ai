---
paths:
  - "app/components/**"
---

# Vue Component Conventions

## Naming

Kebab-case for both component names and attributes (ESLint enforced):

```html
<!-- ❌ Bad -->
<BlobSasLink myProp="value" />

<!-- ✅ Good -->
<blob-sas-link my-prop="value" />
```

## Two-Way Bindings

Use `defineModel()` — never manually wire emit/prop pairs:

```js
// ❌ Bad
const props = defineProps(['modelValue'])
const emit = defineEmits(['update:modelValue'])

// ✅ Good
const model = defineModel()
```

## Validation Responsibility

- Components do **NOT** validate input or type-check props
- Components do **NOT** prevent nulls or empty values from reaching Pinia
- **Pinia stores** validate data via zod schemas before sending to backend
- Components are **only responsible for surfacing and displaying errors**

This split exists to avoid duplicate validation logic that is difficult to debug. Trust that the store and backend have consistent error handling.
