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
      <Suspense :key="hashId">
        <upload-overview :hash-id="hashId" />
        <template #fallback>
          <div class="space-y-3">
            <USkeleton class="h-4 w-[250px]" />
            <USkeleton class="h-4 w-[250px]" />
            <USkeleton class="h-4 w-[250px]" />
            <USkeleton class="h-4 w-[250px]" />
          </div>
        </template>
      </Suspense>
    </template>
  </UDashboardPanel>
</template>
