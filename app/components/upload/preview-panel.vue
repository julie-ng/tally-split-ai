<script setup>
import { useUploadsStore } from '~/stores/uploads.store'

const props = defineProps({
  hashId: {
    type: String,
    default: null,
  },
})

const emit = defineEmits(['close'])

const uploadsStore = useUploadsStore()

const upload = computed(() =>
  props.hashId ? uploadsStore.getUploadByHashId(props.hashId) : null,
)

// Cache-aware fetch on hashId change. Returns immediately if the full record
// is already cached; otherwise fetches in the background.
watch(
  () => props.hashId,
  (hashId) => {
    if (hashId) uploadsStore.fetchUploadByHashId(hashId)
  },
  { immediate: true },
)

function handleClose () {
  emit('close')
}

function onKeydown (event) {
  if (event.key === 'Escape' && props.hashId) {
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
              <upload-preview-overview :hash-id="hashId" />
            </ui-collapsible-property-group>

            <hr class="text-slate-300 my-3">

            <ui-collapsible-property-group title="AI Analysis">
              <upload-preview-analysis :hash-id="hashId" />
            </ui-collapsible-property-group>

            <hr class="text-slate-300 my-3">

            <ui-collapsible-property-group title="Azure Info">
              <upload-preview-azure :hash-id="hashId" />
            </ui-collapsible-property-group>
          </UCard>
        </div>
        <div class="col-span-2">
          <blob-image
            :blob-name="upload.blobName"
            :alt="upload.blobName"
          />
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
