<script setup>
// The expanded body of one timeline step. Pure presentational leaf — fixed
// layout pattern, in order:
//   1. description  — grey helper text (prop)
//   2. #summary     — natural-language paragraph (slot, falls back to `summary`
//                     prop). e.g. the handwritten-analysis split reasoning.
//   3. rows table   — the {label, value} detail list (prop). Same shape for
//                     every step, so it's a prop not a slot.
//   4. #footer      — optional action area (slot). e.g. the Create Expense
//                     step's link to the created expense.
// Slots override; props are the default (project slot-with-fallback convention).

defineProps({
  description: {
    type: String,
    default: null,
  },
  // Fallback for the #summary slot — a plain paragraph string.
  summary: {
    type: String,
    default: null,
  },
  // The detail table: [{ label, value }]. Renders nothing when empty.
  rows: {
    type: Array,
    default: () => [],
  },
})
</script>

<template>
  <!-- No border/padding here: the wrapping <UiCollapsibleCard> owns both. -->
  <div class="space-y-2">
    <!-- 1. description -->
    <p
      v-if="description"
      class="text-xs text-muted mb-3"
    >
      {{ description }}
    </p>

    <!-- 2. summary — slot overrides, else the prop paragraph in a tinted box -->
    <slot name="summary">
      <p
        v-if="summary"
        class="rounded-md bg-muted px-2.5 py-2 text-xs leading-relaxed text-toned"
      >
        {{ summary }}
      </p>
    </slot>

    <!-- 3. rows table -->
    <div
      v-if="rows?.length"
      class="space-y-1"
    >
      <div
        v-for="row in rows"
        :key="row.label"
        class="flex items-baseline gap-2 text-xs"
      >
        <span class="w-24 shrink-0 text-muted">{{ row.label }}</span>
        <span class="text-default break-words tabular-nums">{{ row.value }}</span>
      </div>
    </div>

    <!-- 4. footer — optional action area -->
    <div
      v-if="$slots.footer"
      class="pt-1"
    >
      <slot name="footer" />
    </div>
  </div>
</template>
