<script setup>
import { useUploadsStore } from '~/stores/uploads.store'

const props = defineProps({
  hashId: { type: String, default: null },
})

const emit = defineEmits(['close'])

const uploadsStore = useUploadsStore()

const upload = computed(() =>
  props.hashId ? uploadsStore.getUploadByHashId(props.hashId) : null,
)

// Refresh the full upload record in the background whenever hashId changes.
// We rely on the cached value from the store (via the computed above) for
// immediate render — this keeps it fresh.
watch(
  () => props.hashId,
  (hashId) => {
    if (hashId) uploadsStore.refreshUploadByHashId(hashId)
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
      <div
        v-if="!upload"
        class="space-y-3"
      >
        <USkeleton class="h-4 w-[250px]" />
        <USkeleton class="h-4 w-[250px]" />
        <USkeleton class="h-4 w-[250px]" />
        <USkeleton class="h-4 w-[250px]" />
      </div>
      <upload-overview-tab-content
        v-else
        :upload="upload"
      />
    </template>
  </UDashboardPanel>
</template>
