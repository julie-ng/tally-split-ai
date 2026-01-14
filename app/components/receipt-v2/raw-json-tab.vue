<script setup>
defineProps({
  receipt: Object,
})
</script>

<template>
  <div class="bg-slate-800 p-4 mt-4">
    <vue-json-pretty
      :data="receipt"
      :indent="2"
      :deep="4"
      :showIcon="true"
      :showLength="true"
    />
  </div>
</template>
