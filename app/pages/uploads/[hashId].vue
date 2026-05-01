<script setup>
import { useIntervalFn } from '@vueuse/core'
import { UPLOAD_ANALYSIS_STATUS } from '~~/shared/enums/upload-analysis-status.js'

const route = useRoute()
const hashId = route.params.hashId

// Fetch upload details
const { data: upload, pending, error, refresh } = await useFetch(`/api/uploads/${hashId}`)

// Fetch analysis data
const { data: analysisData, pending: analysisPending, error: analysisError } = await useFetch(`/api/analysis/summary/${hashId}`)

// TODO: Evaluate where polling belongs — currently dies on page navigation.
// Consider moving to a Pinia store or app-level composable so workflow status
// updates survive navigation (e.g., user goes to /receipts while OCR is running).
const isProcessing = computed(() => {
  const status = upload.value?.analysisStatus
  return status === UPLOAD_ANALYSIS_STATUS.QUEUED || status === UPLOAD_ANALYSIS_STATUS.PROCESSING
})

const { pause, resume } = useIntervalFn(async () => {
  if (isProcessing.value) {
    await refresh()
  }
  else {
    pause()
  }
}, 3000, { immediate: false })

watch(isProcessing, (val) => {
  if (val) resume()
  else pause()
}, { immediate: true })

// Set page title reactively after upload is fetched
useHead({
  // eslint-disable-next-line no-constant-binary-expression
  title: () => `${upload.value?.title} | Upload` || `Upload ${hashId}`,
})

const breadcrumbItems = [
  {
    label: 'Uploads',
    to: '/uploads',
  }, {
    label: hashId,
    to: `/uploads/${hashId}`,
  },
]
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="upload?.title ?? `Upload ${hashId}`">
        <template #left>
          <UBreadcrumb :items="breadcrumbItems" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <!-- Loading -->
      <loading-placeholder v-if="pending" title="Loading Upload" :hash-id="hashId" />

      <!-- Error -->
      <UAlert
        v-else-if="error"
        title="Unable to Load Upload"
        :description="error.message"
        class="my-5"
        color="error"
        variant="subtle"
        icon="i-lucide-triangle-alert"
      />

      <!-- Upload Details -->
      <div v-else-if="upload">
        <upload-analysis-tab
          :upload="upload"
          :analysis-data="analysisData"
          :analysis-pending="analysisPending"
          :analysis-error="analysisError"
        />
      </div>

      <!-- Not found state -->
      <div v-else>
        <not-found :title="`Upload Not Found`" :hash-id="hashId" />
      </div>
    </template>
  </UDashboardPanel>
</template>

<style scoped>
pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-x: auto;
  max-width: 100%;
}
</style>
