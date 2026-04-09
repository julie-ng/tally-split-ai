<script setup>
const props = defineProps({
  status: {
    type: String,
    required: true,
  },
})

const iconName = computed(() => {
  switch (props.status) {
    case 'uploaded': return 'i-lucide-circle-check'
    case 'failed': return 'i-lucide-circle-alert'
    default: return 'i-lucide-circle-fading-arrow-up'
  }
})

const statusColor = computed(() => {
  switch (props.status) {
    case 'uploaded': return 'text-green-500'
    case 'failed': return 'text-red-500'
    default: return 'text-amber-500'
  }
})
</script>

<template>
  <span :class="statusColor">
    <UIcon :name="iconName" class="size-4 align-middle mr-1" />
    <span class="capitalize">{{ status }}</span>
  </span>
</template>
