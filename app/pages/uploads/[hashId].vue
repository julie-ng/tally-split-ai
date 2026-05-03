<script setup>
import { useUploadsStore } from '~/stores/uploads.store'

const route = useRoute()
const hashId = route.params.hashId

const uploadsStore = useUploadsStore()

await uploadsStore.fetchUploadByHashId(hashId)

const upload = computed(() => uploadsStore.getUploadByHashId(hashId))

useHead({
  title: () => upload.value?.title ? `${upload.value.title} | Upload` : `Upload ${hashId}`,
})

const breadcrumbItems = [
  { label: 'Uploads', to: '/uploads' },
  { label: hashId, to: `/uploads/${hashId}` },
]
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="upload?.title ?? `Upload ${hashId}`">
        <template #left>
          <UBreadcrumb :items="breadcrumbItems" />
        </template>
        <template #right>
          <UButton
            :to="`/api/analysis/summary/${hashId}`"
            target="_blank"
            external
            color="neutral"
            variant="subtle"
            icon="i-lucide-external-link"
          >
            View raw OCR
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <upload-overview-tab-content v-if="upload" :hash-id="hashId" />
      <not-found v-else :title="`Upload Not Found`" :hash-id="hashId" />
    </template>
  </UDashboardPanel>
</template>
