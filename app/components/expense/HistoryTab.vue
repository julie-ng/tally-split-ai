<script setup>
import { useExpensesStore } from '~/stores/expenses.store'
import { useHouseholdStore } from '~/stores/household.store'

// History tab of the expense preview. Store-driven, EXPENSE changes only (split
// edits, settle, paid-by). Receipt-side change history lives on the receipt
// detail page. Works for standalone expenses (no receipt) too.
//
// Reused-leaf rule: this is mounted once and reused as the preview swaps rows,
// so the fetch keys off the id in an immediate watch (a setup-only fetch would
// load just the first expense). See the preview-panel leaf gotcha.
const props = defineProps({
  expenseId: {
    type: String,
    required: true,
  },
})

const expensesStore = useExpensesStore()
const householdStore = useHouseholdStore()

watch(() => props.expenseId, (id) => {
  if (id) {
    expensesStore.fetchExpenseHistory(id)
  }
}, { immediate: true })

// `source` is 'user:<userId>' or 'task:<taskName>'. Resolve humans to their
// avatar + full name; bots/tasks to a bot icon + the task label. Done in a
// computed (not a template call) so each entry carries its resolved `source`.
function describeSource (source) {
  if (source?.startsWith('user:')) {
    const userId = source.slice(5)
    return {
      isBot: false,
      label: householdStore.getMemberName(userId),
      avatar: householdStore.getMemberAvatarUrl(userId),
    }
  }
  // task:<name> (or anything non-user) → bot
  return { isBot: true, label: source, avatar: null }
}

const entries = computed(() => {
  const list = expensesStore.history[props.expenseId]
  if (!list) {
    return list // undefined (loading) passes through
  }
  return list.map(entry => ({ ...entry, src: describeSource(entry.source) }))
})

// `history[id]` is undefined until the fetch resolves; [] once loaded + empty.
const pending = computed(() => entries.value === undefined)

function displayValue (val) {
  return val === null || val === undefined ? 'null' : val
}
</script>

<template>
  <div class="py-4">
    <!-- Loading -->
    <div v-if="pending" class="space-y-4">
      <USkeleton class="h-24 w-full rounded-lg" />
      <USkeleton class="h-24 w-full rounded-lg" />
    </div>

    <!-- Empty -->
    <div v-else-if="entries.length === 0" class="text-muted text-sm py-10 text-center">
      No changes recorded.
    </div>

    <!-- Timeline -->
    <div v-else class="space-y-4">
      <div
        v-for="entry in entries"
        :key="entry.id"
        class="border border-default rounded-lg p-4"
      >
        <!-- Header: who/what made the change + when -->
        <div class="flex items-center gap-2 mb-3">
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
