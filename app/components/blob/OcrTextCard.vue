<script setup>
import { useUploadsStore } from '~/stores/uploads.store'

// Raw OCR text inside the expense preview's Receipt tab.
//
// Named Blob* because this is the machine's transcript of the uploaded FILE, not
// a fact about the receipt: it is read-only source data that POPULATES the
// receipt's fields but is never itself edited.
//
// `ocrText` rides on the upload row — /api/uploads/[id] only excludes the large
// JSONB columns (ocrJson, annotationsJson) — so the store getter already has it
// and there is nothing extra to fetch.
//
// Collapsed by default: it is long, and it is reference material rather than
// something a reader needs on arrival.
const props = defineProps({
  uploadId: {
    type: String,
    required: true,
  },
})

const uploadsStore = useUploadsStore()

watch(() => props.uploadId, (id) => {
  if (id) {
    uploadsStore.fetchUploadById(id)
  }
}, { immediate: true })

const upload = computed(() => uploadsStore.getUploadById(props.uploadId))
const ocrText = computed(() => upload.value?.ocrText)
</script>

<template>
  <UiCollapsibleCard>
    <template #header>
      <span class="text-sm font-medium">
        OCR Text
      </span>
    </template>

    <p v-if="!ocrText" class="text-sm text-dimmed">
      No OCR text was recorded for this upload.
    </p>

    <!-- whitespace-pre-wrap keeps the transcript's line breaks (they mirror the
         receipt's layout) while still wrapping long lines to the panel width. -->
    <pre
      v-else
      class="max-h-96 overflow-auto rounded-lg bg-elevated p-3 font-mono text-xs text-muted whitespace-pre-wrap break-words"
    >{{ ocrText }}</pre>
  </UiCollapsibleCard>
</template>
