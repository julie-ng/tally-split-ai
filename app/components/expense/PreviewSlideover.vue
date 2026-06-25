<script setup>
// Presentational wrapper around <USlideover> for the expense preview. Behavior
// (open-state, URL sync, esc) lives in useExpensePreview(); this owns only the
// markup + props so list pages don't copy-paste the slideover config.
//
// `:dismissible="false"` is load-bearing: with modal/overlay off, a row click
// counts as click-outside → dismiss → open flips → panel repaints (blink). Do
// not remove it. Esc-to-close is restored in the composable instead.
const open = defineModel('open', {
  type: Boolean,
  default: false,
})

defineProps({
  // The previewed expense (carries title + embedded receipt.merchantName).
  expense: {
    type: Object,
    default: null,
  },
  // The previewed expense id, passed to the content leaf.
  expenseId: {
    type: [String, null],
    default: null,
  },
})
</script>

<template>
  <USlideover
    v-model:open="open"
    :title="expense?.title"
    :description="expense?.receipt?.merchantName"
    :modal="false"
    :overlay="false"
    :dismissible="false"
    :transition="false"
    :unmount-on-hide="false"
    :ui="{
      content: 'top-(--ui-header-height) h-[calc(100%-var(--ui-header-height))] max-w-3xl ring-1 ring-default',
    }"
  >
    <template #body>
      <div class="pt-2 px-4">
        <ExpensePreview v-if="expenseId" :expense-id="expenseId" />
      </div>
    </template>
  </USlideover>
</template>
