<script setup>
const props = defineProps({
  color: {
    type: String,
    default: 'text-dimmed',
  },
})
</script>

<template>
  <UIcon
    name="i-lucide-focus"
    class="size-4 inline-block align-middle ml-0.5"
    :class="props.color"
    title="Info extracted by AI"
    aria-label="Info extracted by AI"
  />
</template>
