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
    name="i-lucide-smile-plus"
    class="size-4 inline-block align-middle ml-0.5"
    :class="props.color"
    title="Info added by human via original filename"
    aria-label="Info added by human via original filename"
  />
</template>
