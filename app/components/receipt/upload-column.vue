<script setup>
import { useUploadsStore } from '~/stores/uploads.store'

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
})

const uploadsStore = useUploadsStore()
uploadsStore.refreshUploadById(props.id)
uploadsStore.fetchPolygons(props.id)

const upload = computed(() => uploadsStore.getUploadById(props.id))
const polygonData = computed(() => uploadsStore.getPolygonsById(props.id))

const hasBlobImage = computed(() => upload.value?.status === 'uploaded')

const altText = computed(() => {
  if (!upload.value) return ''
  return (upload.value.title)
    ? `${upload.value.title} (${upload.value.blobName})`
    : upload.value.blobName
})

const hasPolygons = computed(() =>
  polygonData.value?.polygons?.length > 0,
)

const highlightedLabel = inject('highlightedLabel', ref(null))
</script>

<template>
  <div class="border border-slate-200">
    <template v-if="!upload?.blobName">
      <div class="p-4 text-sm text-slate-400">
        Loading upload...
      </div>
    </template>
    <blob-sas-link
      v-else-if="hasBlobImage"
      :blob-name="upload.blobName"
      :blob-url="upload.blobUrl"
    >
      <blob-image-with-polygons
        v-if="hasPolygons"
        :blob-name="upload.blobName"
        :alt="altText"
        :polygons="polygonData.polygons"
        :page-width="polygonData.page.width"
        :page-height="polygonData.page.height"
        :highlighted-label="highlightedLabel"
        @update:highlighted-label="highlightedLabel = $event"
      />
      <blob-image
        v-else
        :blob-name="upload.blobName"
        :alt="altText"
      />
    </blob-sas-link>
    <UAlert
      v-else
      color="error"
      variant="subtle"
      title="Broken Upload"
      description="This receipt is missing an upload."
      icon="i-lucide-triangle-alert"
    />
  </div>
</template>
