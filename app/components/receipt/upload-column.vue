<script setup>
import { useUploadsStore } from '~/stores/uploads.store'

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
})

const uploadsStore = useUploadsStore()

// Keyed off the id via an immediate watch, not a bare setup call: a setup-time
// fetch runs ONCE for the first id, so a later swap would silently never
// re-fetch. See rules/vue-component-conventions.md — the reused-leaf trap.
watch(() => props.id, (id) => {
  if (!id) {
    return
  }
  uploadsStore.refreshUploadById(id)
  uploadsStore.fetchPolygons(id)
}, { immediate: true })

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
  <div class="border border-default">
    <template v-if="!upload?.blobName">
      <div class="p-4 text-sm text-dimmed">
        Loading upload...
      </div>
    </template>
    <blob-sas-link
      v-else-if="hasBlobImage"
      :blob-name="upload.blobName"
      :blob-url="upload.blobUrl"
    >
      <BlobImageWithPolygons
        v-if="hasPolygons"
        :blob-name="upload.blobName"
        :alt="altText"
        :polygons="polygonData.polygons"
        :page-width="polygonData.page.width"
        :page-height="polygonData.page.height"
        :highlighted-label="highlightedLabel"
        @update:highlighted-label="highlightedLabel = $event"
      />
      <BlobImage
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
