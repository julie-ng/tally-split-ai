<script setup>
import { useSplitsStore } from '~/stores/splits.store'

const props = defineProps({
  receipt: Object,
})

const splitsStore = useSplitsStore()
const splitId = computed(() => splitsStore.getSplitIdByReceiptId(props.receipt.id))
const { history, pending } = await useReceiptHistory(props.receipt.id, splitId)

function displayValue (val) {
  return val === null || val === undefined ? '\u2014' : val
}
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
        v-for="entry in history"
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
          <span class="text-xs text-muted font-mono">{{ entry.source }}</span>
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
