<script setup>
import { useUploadQueueStore } from '~/stores/upload-queue.store'

defineProps({
  label: {
    type: String,
    default: 'Upload',
  },
  variant: {
    type: String,
    default: 'solid',
  },
  color: {
    type: String,
    default: 'primary',
  },
})

const uploadQueueStore = useUploadQueueStore()
const showModal = ref(false)

async function onFilesUpdate (files) {
  await uploadQueueStore.addFiles(files)
  showModal.value = false
}
</script>

<template>
  <div>
    <UButton
      icon="i-lucide-upload"
      class="cursor-pointer"
      :variant="variant"
      :color="color"
      @click="showModal = true"
    >
      {{ label }}
    </UButton>

    <UModal v-model:open="showModal" title="Upload Files">
      <template #body>
        <uploads-drop-zone @on-update="onFilesUpdate" />
      </template>
    </UModal>
  </div>
</template>
