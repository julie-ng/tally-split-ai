<script setup>
// The "Image" tab of the upload preview panel: the receipt image + OCR/analysis
// details, re-fit from the old wide (grid-cols-5) slideover into this narrow
// resizable column. Leaf keyed by `id` — reads store getters, warms its own
// lazy/relational data (upload record + polygons) on id-change.
//
// Layout: details FIRST (collapsible property groups), the receipt image LAST.
// Receipt scans can be very tall; keeping the image at the bottom means it never
// pushes the OCR details out of reach — you scroll past the data to the image,
// not the other way around. Image renders full-width at natural height.
import { useUploadsStore } from '~/stores/uploads.store'

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
})

const uploadsStore = useUploadsStore()

const upload = computed(() => uploadsStore.getUploadById(props.id))
const polygonData = computed(() => uploadsStore.getPolygonsById(props.id))
const hasPolygons = computed(() => polygonData.value?.polygons?.length > 0)

// Warm on id-change (immediate covers cold-load where id is born-set). Both are
// cache-aware — a no-op when already fetched (e.g. the 2b warm hit annotations).
watch(
  () => props.id,
  (id) => {
    if (id) {
      uploadsStore.fetchUploadById(id)
      uploadsStore.fetchPolygons(id)
    }
  },
  { immediate: true },
)

// The polygon ↔ line-item hover link (same wiring as the old slideover): the
// image emits which region is hovered, the analysis line-items table reads it.
const { highlightedLabel } = useHighlightedLabel()
provide('highlightedLabel', highlightedLabel)
</script>

<template>
  <div v-if="upload" class="p-4 space-y-3">
    <!-- Details first -->
    <ui-collapsible-property-group title="Overview">
      <upload-preview-overview :id="id" />
    </ui-collapsible-property-group>

    <hr class="border-default">

    <ui-collapsible-property-group title="AI Analysis">
      <upload-preview-analysis :id="id" />
    </ui-collapsible-property-group>

    <hr class="border-default">

    <ui-collapsible-property-group title="Azure Info">
      <upload-preview-azure :id="id" />
    </ui-collapsible-property-group>

    <hr class="border-default">

    <!-- Receipt image LAST (can be very tall). Full-width, natural height. -->
    <blob-image-with-polygons
      v-if="hasPolygons"
      :blob-name="upload.blobName"
      :alt="upload.blobName"
      :polygons="polygonData.polygons"
      :page-width="polygonData.page.width"
      :page-height="polygonData.page.height"
      :highlighted-label="highlightedLabel"
      @update:highlighted-label="highlightedLabel = $event"
    />
    <blob-image
      v-else
      :blob-name="upload.blobName"
      :alt="upload.blobName"
    />
  </div>

  <div v-else class="p-4 text-sm text-muted">
    Loading…
  </div>
</template>
