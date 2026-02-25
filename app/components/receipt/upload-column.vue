<script setup>
const props = defineProps({
  upload: Object,
  uploadHashId: {
    type: String,
    default: null,
  },
})

const hasBlobImage = computed(() => props.upload.status === 'uploaded')

const altText = computed(() => {
  return (props.upload.title)
    ? `${props.upload.title} (${props.upload.blobName})`
    : props.upload.blobName
})

// Fetch bounding polygons for overlay (only if hashId provided)
const { data: polygonsData } = await useFetch(
  () => `/api/analysis/polygons/${props.uploadHashId}`,
  {
    key: `polygons-${props.uploadHashId}`,
    immediate: !!props.uploadHashId,
  },
)

const hasPolygons = computed(() =>
  polygonsData.value?.success
  && polygonsData.value?.data?.polygons?.length > 0,
)

const highlightedLabel = inject('highlightedLabel', ref(null))
</script>

<template>
  <div class="border border-slate-200">
    <blob-sas-link
      v-if="hasBlobImage"
      :blob-name="upload.blobName"
      :blob-url="upload.blobUrl"
    >
      <blob-image-with-overlay
        v-if="hasPolygons"
        :blob-name="props.upload.blobName"
        :alt="altText"
        :polygons="polygonsData.data.polygons"
        :page-width="polygonsData.data.page.width"
        :page-height="polygonsData.data.page.height"
        :highlighted-label="highlightedLabel"
        @update:highlighted-label="highlightedLabel = $event"
      />
      <blob-image
        v-else
        :blob-name="props.upload.blobName"
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
