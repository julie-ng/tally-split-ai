<script setup>
import { useExpensesStore } from '~/stores/expenses.store'

const props = defineProps({
  expenseId: {
    type: String,
    default: null,
  },
})

const emit = defineEmits(['close'])

const expensesStore = useExpensesStore()
const expense = computed(() => props.expenseId ? expensesStore.getExpenseById(props.expenseId) : null)

// USlideover drives visibility via v-model:open. The page owns the URL state
// (?preview=<id>) and passes expenseId; we mirror that into `open` and emit
// `close` when the slideover requests dismissal (X button only — see below).
const open = computed({
  get: () => !!props.expenseId,
  set: (value) => {
    if (!value) {
      emit('close')
    }
  },
})
</script>

<template>
  <USlideover
    v-model:open="open"
    title="Receipt"
    :description="expense?.receipt?.merchantName"
    :modal="false"
    :overlay="false"
    :dismissible="false"
    :ui="{
      content: 'top-(--ui-header-height) h-[calc(100%-var(--ui-header-height))] max-w-3xl ring-1 ring-default',
    }"
  >
    <template #body>
      <div class="pt-2 px-4">
        <expense-overview v-if="expenseId" :expense-id="expenseId" />
      </div>
    </template>
  </USlideover>
</template>
