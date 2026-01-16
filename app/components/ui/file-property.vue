<script setup>
const props = defineProps({
  label: String,
  text: [String, Number],
  ui: {
    type: Object,
    required: false,
    default: () => ({ class: 'my-3' }),
  },
})

const uiClasses = computed(() => props.ui.class)

const displayText = computed(() => {
  if (typeof props.text === 'number') {
    return String(props.text)
  }
  return props.text
})
</script>

<template>
  <div :class="uiClasses">
    <p class="text-sm text-slate-400">
      {{ label }}
    </p>
    <div class="text-base text-slate-500">
      {{ displayText }}
      <slot />
    </div>
  </div>
</template>
