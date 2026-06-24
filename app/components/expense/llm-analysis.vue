<script setup>
import { useExpensesStore } from '~/stores/expenses.store'

const props = defineProps({
  expenseId: {
    type: String,
    required: true,
  },
})

const expensesStore = useExpensesStore()
expensesStore.fetchExpenseHistory(props.expenseId)

const llmChange = computed(() => expensesStore.getLlmChange(props.expenseId))
const historyLoaded = computed(() => !!expensesStore.history[props.expenseId])
</script>

<template>
  <div v-if="historyLoaded" class="my-4">
    <div class="text-sm font-medium text-muted mb-2">
      AI Analysis
    </div>

    <!-- LLM adjustment found -->
    <div v-if="llmChange" class="text-sm text-toned bg-muted rounded-md p-3 space-y-2">
      <div v-if="llmChange.reasoning">
        {{ llmChange.reasoning }}
      </div>
      <div class="flex flex-wrap gap-2 text-xs">
        <UBadge
          v-if="llmChange.confidence !== null"
          :color="llmChange.confidence >= 0.8 ? 'success' : llmChange.confidence >= 0.5 ? 'warning' : 'error'"
          variant="subtle"
        >
          Overall: {{ Math.round(llmChange.confidence * 100) }}%
        </UBadge>
        <UBadge
          v-for="field in llmChange.fields.filter(f => f.confidence !== null)"
          :key="field.field"
          :color="field.confidence >= 0.8 ? 'success' : field.confidence >= 0.5 ? 'warning' : 'error'"
          variant="outline"
        >
          {{ field.field }}: {{ Math.round(field.confidence * 100) }}%
        </UBadge>
      </div>
      <div class="text-xs text-dimmed">
        {{ llmChange.source }} &middot; {{ new Date(llmChange.createdAt).toLocaleString() }}
      </div>
    </div>

    <!-- No LLM adjustment -->
    <div v-else class="text-sm text-dimmed">
      AI reviewed but no adjustment applied.
    </div>
  </div>
</template>
