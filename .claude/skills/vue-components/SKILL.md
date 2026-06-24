---
name: vue-components
description: Vue component conventions and patterns for this project. Use when creating or modifying Vue components in app/components/.
---

# Vue Components

Naming (kebab-case), `defineModel()` for two-way bindings, and validation responsibility (stores validate, components only display errors) are all in the always-loaded, path-scoped rule `.claude/rules/vue-component-conventions.md`. This skill only adds placement + references.

## Placement

- `app/components/` is organized by feature domain — `ls` it to see the current dirs (`receipt/`, `upload/`, `uploads/`, `expense/`, `expenses/`, `blob/`, …).
- Single root element per template (wrap in a `<div>`) so attribute inheritance works.
- Tailwind utilities, no `<style scoped>` blocks.

## Why components stay "dumb"

Components must not `$fetch`/`useFetch` directly, must not validate or null-guard inputs, and must not stop empty values from reaching the store. All data access and validation lives in Pinia (`.claude/rules/zod-validation.md`). The split avoids duplicate, hard-to-debug validation logic — trust the store + backend to handle it consistently.

## Reference components

- `app/components/receipt/edit-form.vue` — form with store interaction
- `app/components/blob/sas-link.vue` — simple display with a SAS URL
- `app/components/upload/preview-azure.vue` — `<ClientOnly>` usage
