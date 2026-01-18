<script setup>
const props = defineProps({
  title: String,
  isOpen: {
    type: Boolean,
    default: true,
  },
})

const isOpen = ref(props.isOpen)
</script>

<template>
  <UCollapsible v-model:open="isOpen">
    <!-- Trigger (default slot) -->
    <div class="font-semibold cursor-pointer flex items-center justify-between w-full">
      <slot v-if="$slots.title" name="title" />
      <template v-else>
        {{ props.title }}
      </template>
      <UIcon
        name="i-lucide-chevron-down"
        class="size-5 transition-transform duration-200"
        :class="{ 'rotate-180': isOpen }"
      />
    </div>

    <!-- Content slot -->
    <template #content>
      <slot />
    </template>
  </UCollapsible>
</template>
