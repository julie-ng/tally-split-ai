<script setup>
const props = defineProps({
  label: String,
  text: [String, Number],
})

const displayText = computed(() => {
  if (typeof props.text === 'number') {
    return String(props.text)
  }
  return props.text
})
</script>

<template>
  <div class="mb-3">
    <p class="text-sm text-slate-400 tracking-wide">
      {{ label }}
    </p>
    <p class="text-base text-slate-500">
      {{ displayText }}
      <slot />
    </p>
  </div>
</template>
