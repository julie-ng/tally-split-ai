<script setup>
const props = defineProps({
  upload: Object // should inherit valid schema.
})

// Fetch analysis results
const { data: analysisData, pending, error } = await useFetch(`/api/analysis/results/${props.upload.hashId}`)
console.log('analysisData', typeof analysisData.value)

</script>




<template>
<div class="pt-6 px-4">

  <div class="mb-4">
    <p>Analysis Status: {{ upload.analysisStatus }}</p>
    <p v-if="upload.analyzedAt">
      Analyzed At: {{ timestampUtils.toShortDate(upload.analyzedAt) }}
    </p>
  </div>

  <!-- Loading state -->
  <LoadingPlaceholder v-if="pending" title="Loading Analysis" />

  <!-- Error state -->
  <UAlert v-else-if="error"
    title="Unable to Load Analysis"
    :description="error.message"
    class="my-5"
    color="error"
    variant="subtle"
    icon="i-lucide-triangle-alert"
  />

  <!-- Analysis data -->
  <div v-else-if="analysisData?.success">
    {{ analysisData.data.analyzeResult.documents.length }}
    <vue-json-pretty :data="analysisData.data"
      :indent="2"
      :deep="4"
      :collapsedNodeLength="3"
      :showIcon="true"
      :showLength="true"
    />
  </div>
  <!-- <pre class="p-5 bg-slate-100 rounded-lg overflow-x-auto">{{ JSON.stringify(analysisData.data, null, 2) }}</pre> -->

  <!-- Not found -->
  <UAlert v-else
    title="No Analysis Data"
    description="Analysis results file not found"
    class="my-5"
    color="warning"
    variant="subtle"
    icon="i-lucide-info"
  />

</div>
</template>
