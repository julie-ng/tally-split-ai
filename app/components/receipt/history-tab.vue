<script setup>
import { useExpensesStore } from '~/stores/expenses.store'
import { useHouseholdStore } from '~/stores/household.store'

const props = defineProps({
  receipt: Object,
})

const expensesStore = useExpensesStore()
const householdStore = useHouseholdStore()
const expenseId = computed(() => expensesStore.getExpenseIdByReceiptId(props.receipt.id))
const { history, pending } = await useReceiptHistory(props.receipt.id, expenseId)

function displayValue (val) {
  return val === null || val === undefined ? 'null' : val
}

// `source` is 'user:<userId>' or 'task:<taskName>'. Resolve humans to avatar +
// full name; bots/tasks to a bot icon + the task label.
function describeSource (source) {
  if (source?.startsWith('user:')) {
    const userId = source.slice(5)
    return {
      isBot: false,
      label: householdStore.getMemberName(userId),
      avatar: householdStore.getMemberAvatarUrl(userId),
    }
  }
  return { isBot: true, label: source, avatar: null }
}

const entries = computed(() =>
  history.value.map(entry => ({ ...entry, src: describeSource(entry.source) })),
)
</script>

<template>
  <div class="pt-6 px-4">
    <!-- Loading -->
    <loading-placeholder v-if="pending" title="Loading History" />

    <!-- Empty -->
    <div v-else-if="history.length === 0" class="text-muted text-sm py-10 text-center">
      No changes recorded
    </div>

    <!-- Timeline -->
    <div v-else class="space-y-4">
      <div
        v-for="entry in entries"
        :key="`${entry.entityType}-${entry.id}`"
        class="border border-default rounded-lg p-4"
      >
        <!-- Header -->
        <div class="flex items-center gap-2 mb-3">
          <UBadge
            :label="entry.entityType"
            :color="entry.entityType === 'receipt' ? 'primary' : 'info'"
            variant="subtle"
            size="xs"
          />
          <UAvatar
            v-if="entry.src.isBot"
            icon="i-lucide-bot"
            size="2xs"
            class="bg-primary/10 text-primary shrink-0"
            :ui="{ icon: 'size-4' }"
          />
          <UAvatar
            v-else
            :src="entry.src.avatar"
            :alt="entry.src.label"
            size="2xs"
            class="shrink-0"
          />
          <span
            class="text-xs"
            :class="entry.src.isBot ? 'text-muted font-mono' : 'text-default'"
          >
            {{ entry.src.label }}
          </span>
          <span class="text-xs text-dimmed ml-auto">
            {{ timestampUtils.toShortDatetime(entry.createdAt) }}
          </span>
        </div>

        <!-- Field changes -->
        <div class="space-y-1">
          <div
            v-for="f in entry.fields"
            :key="f.field"
            class="text-sm flex items-baseline gap-2"
          >
            <span class="font-mono text-xs text-muted w-32 shrink-0">{{ f.field }}</span>
            <span class="text-dimmed">{{ displayValue(f.oldValue) }}</span>
            <span class="text-dimmed">&rarr;</span>
            <span>{{ displayValue(f.newValue) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
