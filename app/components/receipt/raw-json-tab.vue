<script setup>
defineProps({
  receipt: Object,
})
</script>

<template>
  <div class="bg-slate-50 p-4 mt-4">
    <vue-json-pretty
      :data="receipt"
      :indent="2"
      :deep="4"
      :show-icon="true"
      :show-length="true"
    />
  </div>
</template>
