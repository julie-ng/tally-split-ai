<script setup>
import { useHouseholdStore } from '~/stores/household.store'

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
})

defineEmits(['refresh'])

const householdStore = useHouseholdStore()
</script>

<template>
  <div class="flex justify-between items-center mb-5">
    <div>
      <h1 class="font-bold text-2xl">
        {{ title }}
      </h1>
      <p class="mt-1 text-sm text-slate-400">
        Showing {{ paginationInfo.start }}-{{ paginationInfo.end }} of {{ paginationInfo.total }} expenses for
        <NuxtLink :to="householdStore.path" class="underline cursor-pointer">{{ householdStore.name }}</NuxtLink>
      </p>
    </div>
    <div class="flex items-center gap-2">
      <expenses-nav-by-month :label="period" />
      <UButton class="px-4 py-2 cursor-pointer" @click="$emit('refresh')">
        Refresh
      </UButton>
    </div>
  </div>
</template>
