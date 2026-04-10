<script setup>
const props = defineProps({
  receipt: {
    type: Object,
    required: true,
  },
  active: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['select'])

const formattedDate = computed(() => {
  return props.receipt.date
    ? timestampUtils.toShortDate(props.receipt.date)
    : null
})

const formattedTotal = computed(() => {
  return props.receipt.total != null
    ? receiptUtils.formatCurrency(props.receipt.total, props.receipt.currency || 'EUR')
    : null
})

const isSettled = computed(() => props.receipt.split?.isSettled ?? false)
</script>

<template>
  <div
    class="px-4 py-3 cursor-pointer border-b border-default transition-colors"
    :class="active ? 'bg-elevated border-l-2 border-l-primary' : 'hover:bg-elevated/50'"
    @click="emit('select')"
  >
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0 flex-1">
        <p class="font-medium text-sm truncate" :class="active ? 'text-highlighted' : 'text-default'">
          {{ receipt.title || 'Untitled' }}
        </p>
        <p v-if="receipt.merchantName" class="text-xs text-muted truncate">
          {{ receipt.merchantName }}
        </p>
      </div>
      <UIcon
        v-if="isSettled"
        name="i-lucide-circle-check"
        class="size-4 shrink-0 text-emerald-500 mt-0.5"
      />
    </div>

    <div class="flex items-center justify-between mt-1.5">
      <span class="text-xs text-dimmed">
        {{ formattedDate || '—' }}
      </span>
      <span v-if="formattedTotal" class="text-xs font-medium text-default">
        {{ formattedTotal }}
      </span>
    </div>
  </div>
</template>
