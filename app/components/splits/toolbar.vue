<script setup>
import { useHouseholdStore } from '~/stores/household.store'

defineProps({
  settledLabel: {
    type: String,
    required: true,
  },
  settledMenuItems: {
    type: Array,
    required: true,
  },
  paidByLabel: {
    type: String,
    required: true,
  },
  paidByMenuItems: {
    type: Array,
    required: true,
  },
  sortLabel: {
    type: String,
    required: true,
  },
  sortIcon: {
    type: String,
    default: 'i-lucide-arrow-down-wide-narrow',
  },
  sortMenuItems: {
    type: Array,
    required: true,
  },
  hasActiveFilters: {
    type: Boolean,
    default: false,
  },
  paginationInfo: {
    type: Object,
    default: () => ({ start: 0, end: 0, total: 0 }),
  },
})
defineEmits(['reset', 'refresh'])

const householdStore = useHouseholdStore()
</script>

<template>
  <div class="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-0">
    <p class="text-sm text-slate-400">
      Showing {{ paginationInfo.start }}-{{ paginationInfo.end }} of {{ paginationInfo.total }} splits for
      <NuxtLink :to="householdStore.path" class="underline cursor-pointer">{{ householdStore.name }}</NuxtLink>
    </p>

    <div class="flex items-center gap-2">
      <UButton
        color="neutral"
        variant="outline"
        size="sm"
        class="cursor-pointer"
        icon="i-lucide-refresh-cw"
        @click="$emit('refresh')"
      />

      <UDropdownMenu :items="settledMenuItems">
        <UButton
          color="neutral"
          variant="outline"
          size="sm"
          leading-icon="i-lucide-square-check"
          trailing-icon="i-lucide-chevron-down"
        >
          {{ settledLabel }}
        </UButton>

        <template #check-leading="{ item }">
          <UIcon
            name="i-lucide-check"
            class="size-4 shrink-0"
            :class="item.active ? '' : 'invisible'"
          />
        </template>
      </UDropdownMenu>

      <UDropdownMenu :items="paidByMenuItems">
        <UButton
          color="neutral"
          variant="outline"
          size="sm"
          leading-icon="i-lucide-user"
          trailing-icon="i-lucide-chevron-down"
        >
          {{ paidByLabel }}
        </UButton>

        <template #check-leading="{ item }">
          <UIcon
            name="i-lucide-check"
            class="size-4 shrink-0"
            :class="item.active ? '' : 'invisible'"
          />
        </template>
      </UDropdownMenu>

      <UDropdownMenu :items="sortMenuItems">
        <UButton
          color="neutral"
          variant="outline"
          size="sm"
          :leading-icon="sortIcon"
          trailing-icon="i-lucide-chevron-down"
        >
          {{ sortLabel }}
        </UButton>

        <template #check-leading="{ item }">
          <UIcon
            name="i-lucide-check"
            class="size-4 shrink-0"
            :class="item.active ? '' : 'invisible'"
          />
        </template>
      </UDropdownMenu>

      <UButton
        color="neutral"
        :variant="hasActiveFilters ? 'solid' : 'subtle'"
        size="sm"
        icon="i-lucide-x"
        :disabled="!hasActiveFilters"
        @click="$emit('reset')"
      >
        Filters
      </UButton>
    </div>
  </div>
</template>
