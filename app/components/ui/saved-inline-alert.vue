<script setup>
defineProps({
  icon: {
    type: String,
    required: false,
    default: 'i-lucide-cloud-check',
  },
  colorClass: {
    type: String,
    required: false,
    default: 'text-blue-500',
  },
})
</script>

<template>
  <span>
    Saved
    <UIcon
      :name="icon"
      class="mr-2 size-5 align-middle transition-opacity transition-discrete ease-in-out duration-300"
      :class="colorClass"
    />
  </span>
</template>
