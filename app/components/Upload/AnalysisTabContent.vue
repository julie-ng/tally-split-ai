<script setup>
const props = defineProps({
  upload: Object // should inherit valid schema.
})
</script>

<template>
<div class="pt-6 px-4">

  Analysis Status:  {{ upload.analysisStatus }}
  <div v-if="upload.analyzedAt">
  Analyzed At: {{ timestampUtils.toShortDate(upload.analyzedAt) }}
  </div>

  TODO: Show Azure Document Intelligence Analysis

</div>
</template>
