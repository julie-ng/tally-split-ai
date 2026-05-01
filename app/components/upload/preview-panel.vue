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

const isLoading = ref(false)

// Fetch the full upload record whenever hashId changes. The panel stays
// mounted while the user clicks between rows, so swapping content is
// preferable to unmounting + remounting.
watch(
  () => props.hashId,
  async (hashId) => {
    if (!hashId) return
    isLoading.value = true
    try {
      await uploadsStore.refreshUploadByHashId(hashId)
    }
    finally {
      isLoading.value = false
    }
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
      <div v-if="isLoading || !upload" class="space-y-3">
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
