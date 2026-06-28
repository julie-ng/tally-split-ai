---
paths:
  - "app/components/**"
---

# Vue Component Conventions

## Naming

> [!NOTE]
> **Mid-migration to PascalCase filenames.** We are renaming component files to
> PascalCase (`Table.vue`, not `table.vue`), one component at a time, as each is
> reviewed and cleaned up — the casing doubles as a "this component has been
> vetted" marker, so do **not** do a bulk search-and-replace. Expect a mixed
> kebab/Pascal `components/` tree until the migration completes. It is not a
> large haul.

**Component names**: PascalCase filenames (`ExpensesTable.vue`). Component-name
casing is intentionally **not** ESLint-enforced during the migration
(`vue/component-name-in-template-casing` is left `off`) to avoid noise on the
not-yet-renamed files.

**Attributes**: kebab-case, still ESLint-enforced via
`vue/attribute-hyphenation`. PascalCase component names with kebab-case
attributes is the target:

```html
<!-- ✅ Good -->
<ExpensesTable my-prop="value" />

<!-- ❌ Bad — camelCase attribute -->
<ExpensesTable myProp="value" />
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

## Who Fetches: Owner vs. Leaf

Two valid patterns, picked by the component's **role**, not preference:

| | **Self-fetching** (container) | **Props-driven** (leaf) |
|:--|:--|:--|
| Owns | its own data lifecycle | nothing — renders what it's given |
| Use for | route-level pages, widgets rendered **once** | components **swapped or repeated** by id (list rows, preview panels) |
| Fetch | `useAsyncData` in setup | none — parent warms the store |

**Rule of thumb: fetch at the level that owns the data's lifecycle; render at the leaves.** The component that owns the URL/selection state owns the fetch; rapidly-swapped children render already-cached store getters via props.

**Why this matters (the flash):** a leaf that fetches on `id`-change empties itself between `idA` and `idB` — its root `v-if="data"` goes falsy→truthy, the subtree unmounts/remounts, and the user sees a **blink** on every swap. If the owner warms the store when the selection changes, the getter is already populated by the time the leaf renders, so the leaf never blanks out. This also lets a wrapping `USlideover`/transition stay enabled without flickering.

**Concretely:** a preview panel keyed by `?preview=<id>` is a *leaf*. The **page**/composable (URL owner) should `store.fetchX(id)` when the query changes; the panel just reads `store.getXById(id)`. Don't put `watchEffect(() => fetch(id))` inside the swapped leaf. Ref: `useExpensePreview()` (owner: warms expense + receipt on id-change) + `expense/OverviewTab.vue` / `expense/ReadOnly.vue` (leaves: read getters).

> Earlier guidance said leaf components should always self-fetch + show a skeleton. That holds for **once-rendered** relational widgets, not for **swapped-by-id** panels — those must be props-driven to avoid the remount flash. This is the validated resolution of that open question.

### The reused-leaf trap: react to the id, don't snapshot it

A subtle case inside a **reused** container (e.g. a `UTabs` preview panel that swaps rows *without remounting* — the `expenseId` prop changes but the component stays mounted):

- **Store-getter reads** (`computed(() => store.getXById(props.id))`) are safe — they re-evaluate automatically.
- A **bare setup-time fetch** is the trap: `store.fetchHistory(props.id)` in `<script setup>` runs ONCE for the first id; later swaps never re-fetch → that row's data is missing/blank. (Bit `LLMAnalysis` and `HistoryTab`: "shows only after edit".)
- When a reused leaf legitimately self-fetches lazy/relational data (history, an image), do it in `watch(() => props.id, fn, { immediate: true })` — NOT in setup. `immediate` also covers cold-load where the id is born-set and never "changes" (same reason the owner's warm watch is `immediate`).

Rule: **inside a reused-by-id leaf, every fetch keys off the id via an immediate watch; getter computeds are fine as-is.**

## Validation Responsibility

- Components do **NOT** validate input or type-check props
- Components do **NOT** prevent nulls or empty values from reaching Pinia
- **Pinia stores** validate data via zod schemas before sending to backend
- Components are **only responsible for surfacing and displaying errors**

This split exists to avoid duplicate validation logic that is difficult to debug. Trust that the store and backend have consistent error handling.
