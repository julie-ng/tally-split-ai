<script setup>
import { useUploadsStore } from '~/stores/uploads.store'

const props = defineProps({
  id: {
    type: String,
    default: null,
  },
})

const emit = defineEmits(['close'])

// USlideover drives visibility via v-model:open. The page owns the URL state
// (?preview=<id>) and passes id; mirror that into `open` and emit `close` on
// dismissal (X button only — dismissible is off so row-clicks don't close it).
const open = computed({
  get: () => !!props.id,
  set: (value) => {
    if (!value) {
      emit('close')
    }
  },
})

const uploadsStore = useUploadsStore()

const upload = computed(() =>
  props.id ? uploadsStore.getUploadById(props.id) : null,
)

const polygonData = computed(() =>
  props.id ? uploadsStore.getPolygonsById(props.id) : null,
)
const hasPolygons = computed(() => polygonData.value?.polygons?.length > 0)

// Cache-aware fetch on id change. Returns immediately if the full record
// is already cached; otherwise fetches in the background.
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

const { highlightedLabel } = useHighlightedLabel()
provide('highlightedLabel', highlightedLabel)
</script>

<template>
  <USlideover
    v-model:open="open"
    :title="upload?.title ?? 'Upload preview'"
    :description="upload?.originalFilename"
    :modal="false"
    :overlay="false"
    :dismissible="false"
    :ui="{
      content: 'top-(--ui-header-height) h-[calc(100%-var(--ui-header-height))] max-w-3xl ring-1 ring-default',
    }"
  >
    <template #body>
      <div v-if="!upload" class="pt-2 px-4 text-muted">
        Loading…
      </div>
      <div v-else class="pt-2 px-4 grid grid-cols-5 gap-6">
        <div class="col-span-3">
          <UCard>
            <ui-collapsible-property-group title="Overview">
              <upload-preview-overview :id="id" />
            </ui-collapsible-property-group>

            <hr class="border-default my-3">

            <ui-collapsible-property-group title="AI Analysis">
              <upload-preview-analysis :id="id" />
            </ui-collapsible-property-group>

            <hr class="border-default my-3">

            <ui-collapsible-property-group title="Azure Info">
              <upload-preview-azure :id="id" />
            </ui-collapsible-property-group>
          </UCard>
        </div>
        <div class="col-span-2">
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
      </div>
    </template>
  </USlideover>
</template>
