<script setup>
defineProps({
  tags: {
    type: String,
    required: true,
  },
  color: {
    type: String,
    required: false,
    default: 'info',
  },
  variant: {
    type: String,
    required: false,
    default: 'soft',
  },
})
</script>

<template>
  <div>
    <UBadge
      v-for="(tag, i) in tags.split(',')"
      :key="`tag-${i}`"
      class="text-slate-500 m"
      :color="color"
      :variant="variant"
    >
      {{ tag.trim() }}
    </UBadge>
  </div>
</template>
