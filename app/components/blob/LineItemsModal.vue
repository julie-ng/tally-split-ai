<script setup>
import { useUploadsStore } from '~/stores/uploads.store'

// Full-size receipt analysis: the line-items and OCR cards on the left, the
// image with its polygon overlay on the right, each column scrolling
// independently.
//
// This is the surface the cross-highlighting was built for. Hovering a table
// cell lights the matching polygon and vice versa, which needs BOTH visible at
// once — impossible in the preview panel's single narrow column, which is why
// this is a modal rather than more cards.
//
// The `highlightedLabel` ref is PROVIDED here. ItemsTable injects it with a
// local-ref fallback, so it renders inertly elsewhere; this is the one place the
// channel actually has two ends.
//
// The left column reuses the SAME cards as the Receipt tab — they self-fetch by
// uploadId, so this component owns only the image and the highlight channel.
const props = defineProps({
  uploadId: {
    type: String,
    required: true,
  },
  alt: {
    type: String,
    default: 'Receipt image',
  },
})

const open = defineModel('open', { type: Boolean, default: false })

const uploadsStore = useUploadsStore()

// Fetched lazily, keyed off the id AND the open state: polygons are only needed
// once the modal is actually opened. Both calls are cache-aware, so reopening is
// free. The cards in the left column fetch their own data.
watch([() => props.uploadId, open], ([id, isOpen]) => {
  if (id && isOpen) {
    uploadsStore.fetchUploadById(id)
    uploadsStore.fetchPolygons(id)
  }
}, { immediate: true })

const upload = computed(() => uploadsStore.getUploadById(props.uploadId))
const polygonData = computed(() => uploadsStore.getPolygonsById(props.uploadId))
const hasPolygons = computed(() => polygonData.value?.polygons?.length > 0)

const highlightedLabel = ref(null)
provide('highlightedLabel', highlightedLabel)
</script>

<template>
  <UModal
    v-model:open="open"
    :title="alt"
    dismissible
    :ui="{ content: 'max-w-4xl h-[85vh]' }"
  >
    <template #body>
      <!-- min-h-0 is load-bearing: a grid child defaults to min-height:auto
           ("as tall as my content"), which would push the columns past the modal
           and scroll the PAGE instead of each column. -->
      <!-- 60/40, with an explicit `0` minimum on each track: a grid track
           defaults to min-content, so a wide table or image would push its
           column past the ratio instead of scrolling inside it. -->
      <div class="grid h-full min-h-0 grid-cols-1 gap-4 md:grid-cols-[minmax(0,60fr)_minmax(0,40fr)]">
        <div class="min-h-0 space-y-4 overflow-y-auto pr-1">
          <ReceiptLineItemsCard :upload-id="uploadId" />
          <BlobOcrTextCard :upload-id="uploadId" />
        </div>

        <div class="min-h-0 overflow-y-auto">
          <BlobImageWithPolygons
            v-if="upload?.blobName && hasPolygons"
            v-model:highlighted-label="highlightedLabel"
            :blob-name="upload.blobName"
            :alt="alt"
            :polygons="polygonData.polygons"
            :page-width="polygonData.page.width"
            :page-height="polygonData.page.height"
          />
          <BlobImage
            v-else-if="upload?.blobName"
            :blob-name="upload.blobName"
            :alt="alt"
          />
          <USkeleton v-else class="aspect-3/4 w-full rounded-lg" />
        </div>
      </div>
    </template>
  </UModal>
</template>
