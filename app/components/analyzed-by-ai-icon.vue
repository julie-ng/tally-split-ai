<script setup>
defineProps({
  color: {
    type: String,
    default: 'text-primary-600',
  },
})
</script>

<template>
  <UIcon
    name="i-lucide-focus"
    class="size-4 inline-block align-middle ml-0.5"
    :class="color"
    title="Info extracted by AI"
    aria-label="Info extracted by AI"
  />
</template>
