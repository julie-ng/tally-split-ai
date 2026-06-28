<script setup>
import { useExpensesStore } from '~/stores/expenses.store'
import { useHouseholdStore } from '~/stores/household.store'

// Overview tab = thin mode-switcher: skeleton → edit form → read view.
// Presentation lives in the leaves (ExpenseReadOnly / ExpenseEditForm).
const props = defineProps({
  expenseId: {
    type: String,
    required: true,
  },
})

const expensesStore = useExpensesStore()
const householdStore = useHouseholdStore()

// Warm store getter — the list already loaded the expense.
const expense = computed(() => expensesStore.getExpenseById(props.expenseId))

// Skeleton only on genuine first load (deep-link/swap before the list arrives).
const hasLoaded = ref(false)
watch(expense, (value) => {
  if (value) {
    hasLoaded.value = true
  }
}, { immediate: true })

// View mode ↔ edit mode. Reset to read view when the previewed expense changes
// (the panel swaps rows without unmounting).
const isEditing = ref(false)
watch(() => props.expenseId, () => {
  isEditing.value = false
})
</script>

<template>
  <ClientOnly>
    <div class="p-2">
      <!-- Single-member household: splitting is meaningless -->
      <div v-if="!householdStore.hasTwoMembers" class="text-sm text-dimmed">
        Splitting is only possible if your household has more than one member.
      </div>

      <!-- Skeleton on genuine first load -->
      <div v-else-if="!hasLoaded" class="space-y-3 animate-pulse">
        <div class="h-8 bg-elevated rounded" />
        <div class="h-8 bg-elevated rounded" />
        <div class="h-8 bg-elevated rounded" />
        <div class="h-8 bg-elevated rounded" />
      </div>

      <!-- Edit mode: full form with Save/Cancel -->
      <ExpenseEditForm
        v-else-if="isEditing"
        :expense-id="expenseId"
        @saved="isEditing = false"
        @cancel="isEditing = false"
      />

      <!-- Read mode -->
      <ExpenseReadOnly
        v-else
        :expense-id="expenseId"
        @edit="isEditing = true"
      />
    </div>
  </ClientOnly>
</template>
