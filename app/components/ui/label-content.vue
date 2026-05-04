<script setup>
const props = defineProps({
  label: String,
  content: [String, Number],
  ui: {
    type: Object,
    required: false,
    default: () => ({ class: 'my-3' }),
  },
})

const uiClasses = computed(() => props.ui.class)

const displayContent = computed(() => {
  if (typeof props.content === 'number') {
    return String(props.content)
  }
  return props.content
})
</script>

<template>
  <div :class="uiClasses">
    <p class="text-xs text-dimmed">
      {{ label }}
    </p>
    <div class="text-sm text-muted">
      {{ displayContent }}
      <slot />
    </div>
  </div>
</template>
