<script setup>
import { useUploadsStore } from '~/stores/uploads.store'

const props = defineProps({
  id: {
    type: String,
    default: null,
  },
})

const emit = defineEmits(['close'])

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

function handleClose () {
  emit('close')
}

function onKeydown (event) {
  if (event.key === 'Escape' && props.id) {
    handleClose()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <UDashboardPanel id="uploads-detail">
    <template #header>
      <UDashboardNavbar
        :title="upload?.title ?? 'Upload preview'"
        :description="upload?.originalFilename"
      >
        <template #right>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            aria-label="Close"
            @click="handleClose"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="!upload" class="pt-6 px-4 text-muted">
        Loading…
      </div>
      <div v-else class="pt-6 px-4 grid grid-cols-5 gap-6">
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
  </UDashboardPanel>
</template>
