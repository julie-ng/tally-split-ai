<script setup>
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
  sortMenuItems: {
    type: Array,
    required: true,
  },
  hasActiveFilters: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['reset'])
</script>

<template>
  <div class="flex items-center justify-end gap-2 -mb-1">
    <UDropdownMenu :items="settledMenuItems">
      <UButton
        color="neutral"
        variant="outline"
        size="sm"
        leading-icon="i-lucide-square-check"
        trailing-icon="i-lucide-chevron-down"
      >
        Settled · {{ settledLabel }}
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
        Paid By · {{ paidByLabel }}
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
        leading-icon="i-lucide-arrow-down-wide-narrow"
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
</template>
