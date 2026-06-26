<script setup>
import { useExpensesStore } from '~/stores/expenses.store'

const props = defineProps({
  expenseId: {
    type: String,
    required: true,
  },
})

const expensesStore = useExpensesStore()

// Fetch history whenever the previewed expense changes — this leaf is mounted
// once and reused as the preview panel swaps rows (the prop changes without a
// remount), so a one-shot setup fetch only ever loaded the FIRST expense.
watch(() => props.expenseId, (id) => {
  if (id) {
    expensesStore.fetchExpenseHistory(id)
  }
}, { immediate: true })

const llmChange = computed(() => expensesStore.getLlmChange(props.expenseId))
const historyLoaded = computed(() => !!expensesStore.history[props.expenseId])
</script>

<template>
  <div v-if="historyLoaded" class="my-4">
    <div class="text-sm font-medium text-muted mb-2">
      AI Analysis
    </div>

    <!-- LLM adjustment found — rendered as a chat bubble from the "bot" -->
    <div v-if="llmChange" class="flex items-start gap-2">
      <!-- Bot avatar -->
      <UAvatar
        icon="i-lucide-bot"
        size="sm"
        class="shrink-0 bg-primary/10 text-primary"
      />

      <!-- Bubble -->
      <div class="text-sm text-toned bg-primary/5 rounded-lg  p-3 space-y-2">
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
    </div>

    <!-- No LLM adjustment -->
    <div v-else class="text-sm text-dimmed">
      AI reviewed but no adjustment applied.
    </div>
  </div>
</template>
