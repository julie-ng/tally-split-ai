<script setup>
defineProps({
  label: {
    type: String,
    required: false,
    default: 'All dates',
  },
})

const items = useSplitMonths()
</script>

<template>
  <div class="text-left">
    <UDropdownMenu
      :items="items"
      :content="{
        align: 'start',
        side: 'bottom',
      }"
      :ui="{ content: 'w-(--reka-dropdown-menu-trigger-width)', itemLabel: 'hover:text-blue-600' }"
    >
      <UButton
        :label="label"
        class="w-42 cursor-pointer"
        color="neutral"
        variant="subtle"
        leading-icon="i-lucide-calendar-range"
        :ui="{ base: 'justify-start' }"
      />
    </UDropdownMenu>
  </div>
</template>
