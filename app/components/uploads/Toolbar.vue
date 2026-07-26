<script setup>
// Controls row for the uploads list: batch actions (left, when rows selected) +
// count / refresh / filter (right). Mirrors ExpensesToolbar. Sort and further
// filters will be added here — the layout is built to grow.
defineProps({
  filterOptions: {
    type: Array,
    required: true,
  },
  paginationInfo: {
    type: Object,
    default: () => ({ start: 0, end: 0, total: 0 }),
  },
  selectedCount: {
    type: Number,
    default: 0,
  },
})
defineEmits(['refresh', 'batch-delete'])

// The active filter value is two-way bound so the page owns the source of truth.
const filterValue = defineModel('filterValue', {
  type: String,
  default: 'all',
})
</script>

<template>
  <div class="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-0">
    <!-- Batch actions: only shown when rows are selected. The page owns the
         actual mutation; this just surfaces the button + count. -->
    <div v-if="selectedCount > 0" class="flex items-center gap-2">
      <UButton
        color="neutral"
        variant="subtle"
        size="sm"
        class="cursor-pointer"
        icon="i-lucide-trash-2"
        @click="$emit('batch-delete')"
      >
        Delete ({{ selectedCount }})
      </UButton>
    </div>
    <div v-else />

    <div class="flex items-center gap-2">
      <p class="text-sm text-dimmed">
        Showing {{ paginationInfo.start }}-{{ paginationInfo.end }} of {{ paginationInfo.total }} uploads
      </p>

      <UButton
        color="neutral"
        variant="outline"
        size="sm"
        class="cursor-pointer"
        icon="i-lucide-refresh-cw"
        @click="$emit('refresh')"
      />

      <USelect
        v-model="filterValue"
        :items="filterOptions"
        size="sm"
        class="min-w-[160px]"
      />
    </div>
  </div>
</template>
