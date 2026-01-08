<script setup>
const props = defineProps({
  title: String,
  isOpen: {
    type: Boolean,
    default: true
  }
})

const isOpen = ref(true)
</script>

<template>
  <UCollapsible v-model:open="isOpen">
    <h2 class="mb-3 font-semibold text-lg cursor-pointer flex items-center justify-between">
      {{ props.title }}
      <UIcon
        name="i-lucide-chevron-down"
        class="size-5 transition-transform duration-200"
        :class="{ 'rotate-180': isOpen }"
      />
    </h2>
    <template #content>
      <slot />
    </template>
  </UCollapsible>
</template>
