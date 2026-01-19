<script setup>
useHead({
  title: 'Debugging Azure AI Output',
})

const analyzedUploads = [
  '1b27fc03e58a',
  '1f7396b8e412',
  '35d9b64c5b3b',
  '494d95ab8764',
  '7aaaa195168e',
  '9afa2bc842b0',
  // 'b8a8169d9665', // deleted
  'fa739920f8c7',
]

// Fetch all analysis summaries
const summaries = ref([])
const pending = ref(true)
const error = ref(null)

onMounted(async () => {
  try {
    const fetchPromises = analyzedUploads.map(async (hashId) => {
      const response = await $fetch(`/api/analysis/summary/${hashId}`)
      return response.data
    })

    summaries.value = await Promise.all(fetchPromises)
  }
  catch (e) {
    error.value = e
  }
  finally {
    pending.value = false
  }
})
</script>

<template>
  <UContainer class="pt-5">
    <h1 class="text-2xl font-semibold mb-4">
      Debugging Azure AI Output (Analyses)
    </h1>

    <loading-placeholder v-if="pending" title="Loading Analysis Data" />

    <UAlert
      v-else-if="error"
      color="error"
      icon="i-lucide-circle-alert"
      variant="subtle"
      title="Failed to load analysis data. Please try again later."
      :description="error.message"
    />

    <div v-else>
      <analysis-table :uploads="summaries" />
    </div>
  </UContainer>
</template>
