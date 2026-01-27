<script setup>
defineProps({
  title: {
    type: String,
    required: true,
  },
  period: {
    type: String,
    required: false,
    default: 'All dates',
  },
  paginationInfo: {
    type: Object,
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
})

defineEmits(['refresh'])
</script>

<template>
  <div class="flex justify-between items-center mb-5">
    <div>
      <h1 class="font-bold text-2xl">
        {{ title }}
      </h1>
      <p class="mt-1 text-sm text-slate-400">
        Showing {{ paginationInfo.start }}-{{ paginationInfo.end }} of {{ paginationInfo.total }} splits for
        {{ userId }}
      </p>
    </div>
    <div class="flex items-center gap-2">
      <splits-nav-by-month :label="period" />
      <UButton class="px-4 py-2 cursor-pointer" @click="$emit('refresh')">
        Refresh
      </UButton>
    </div>
  </div>
</template>
