<script setup>
import { useUploadsStore } from '~/stores/uploads.store'

// Upload provenance inside the expense preview's Receipt tab: the upload's id,
// its original filename, size, and when it was last analyzed.
//
// Self-fetching by id. The uploads store is the single owner of upload data and
// realtime keeps it current, so a caller only needs to know the id — it does not
// have to warm the store first.
//
// The fetch keys off the id via an IMMEDIATE watch, never a bare setup call:
// this card is reused as the preview panel swaps rows without remounting, so a
// setup-time fetch would run once for the first id and silently never re-fetch.
// See rules/vue-component-conventions.md — the reused-leaf trap.
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
</script>

<template>
  <div
    v-if="!upload"
    class="rounded-lg border border-default bg-default px-4 py-3 space-y-3"
  >
    <USkeleton class="h-5 w-1/2" />
    <USkeleton class="h-4 w-full" />
  </div>

  <UiCollapsibleCard
    v-else
    default-open
  >
    <template #header>
      <span class="text-sm font-medium">
        Upload
      </span>
    </template>

    <UiDefinitionList class="text-sm text-muted">
      <UiDefinitionTerm
        label="ID"
        label-class="text-dimmed"
        value-class="font-mono text-dimmed"
      >
        {{ upload.id }}
      </UiDefinitionTerm>
      <UiDefinitionTerm label="Last Analyzed" value-class="tabular-nums">
        {{ timestampUtils.toShortDatetime(upload.analyzedAt) }}
      </UiDefinitionTerm>

      <UiDefinitionTerm label="Blob Name" value-class="break-words">
        {{ upload.originalFilename }}
      </UiDefinitionTerm>

      <UiDefinitionTerm label="File Size">
        {{ upload.size != null ? formatBytes(upload.size) : '—' }}
      </UiDefinitionTerm>
    </UiDefinitionList>

    <!-- Outside the list on purpose. A <dd> may legally hold an image, but the
         rows above are label→value pairs read left-to-right, and DefinitionTerm
         right-aligns its <dd> in a flex row — an image there would be squeezed
         into the value column. The image IS the upload, not a fact about it.
         BlobImage fetches its own SAS read-URL lazily. -->
    <div class="mt-4">
      <UAlert
        v-if="!upload.blobName"
        color="warning"
        variant="subtle"
        icon="i-lucide-image-off"
        title="No receipt image"
        description="This receipt has no uploaded image to display."
      />
      <div
        v-else
        class="overflow-hidden rounded-lg ring-1 ring-default"
      >
        <BlobImage :blob-name="upload.blobName" :alt="upload.originalFilename" />
      </div>
    </div>
  </UiCollapsibleCard>
</template>
