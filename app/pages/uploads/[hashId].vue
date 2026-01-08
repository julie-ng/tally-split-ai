<script setup>
import { useUserStore } from '~/stores/user.store'

const route = useRoute()
const hashId = route.params.hashId
const userStore = useUserStore()

// Fetch upload details
const { data: upload, pending, error } = await useFetch(`/api/uploads/${hashId}`)

// Fetch analysis data
const { data: analysisData, pending: analysisPending, error: analysisError } = await useFetch(`/api/analysis/summary/${hashId}`)

// Set page title reactively after upload is fetched
useHead({
  title: () => `${upload.value?.title} | Upload` || `Upload ${hashId}`
})

const breadcrumbItems = [
  {
    label: 'Uploads',
    to: '/uploads'
  }, {
    label: hashId,
    to: `/uploads/${hashId}`
  }
]
</script>

<template>
  <UContainer class="pt-5">
    <UBreadcrumb :items="breadcrumbItems" />

    <!-- Loading -->
    <LoadingPlaceholder v-if="pending" title="Loading Upload" :hashId="hashId" />

    <!-- Error -->
    <UAlert v-else-if="error"
      title="Unable to Load Upload" :description="error.message"
      class="my-5" color="error" variant="subtle" icon="i-lucide-triangle-alert"
    />

    <!-- Upload Details -->
    <div v-else-if="upload">
      <UploadAnalysisTab
        :upload="upload"
        :analysisData="analysisData"
        :analysisPending="analysisPending"
        :analysisError="analysisError"
      />
    </div>

    <!-- Not found state -->
    <div v-else>
      <NotFound :title="`Upload Not Found`" :hashId="hashId" />
    </div>
  </UContainer>
</template>

<style scoped>
pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-x: auto;
  max-width: 100%;
}
</style>
