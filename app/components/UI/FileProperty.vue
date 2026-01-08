<script setup>
defineProps({
  label: String,
  text: String,
})
</script>

<template>
<div class="mb-3">
  <p class="text-sm text-slate-400 tracking-wide">
    {{ label }}
  </p>
  <p class="text-base text-slate-500">
    {{ text }}
    <slot/>
  </p>
</div>
</template>
