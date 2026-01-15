<script setup>
import { useUploadQueueStore } from '~/stores/upload-queue.store'

const uploadsStore = useUploadQueueStore()

const props = defineProps({
  hashId: String,
})

// Get the upload from the store
const upload = computed(() =>
  uploadsStore.queued.find(u => u.hashId === props.hashId),
)

const sizeInBytes = computed(() =>
  upload.value ? formatBytes(upload.value.size) : '',
)
</script>

<template>
  <article v-if="upload" class="my-4 p-5 bg-white border-slate-200 border-solid border rounded-md">
    <UButton
      color="neutral"
      variant="ghost"
      class="float-right text-slate-500 hover:bg-orange-100 hover:text-orange-500 cursor-pointer"
      icon="i-lucide-x"
      @click="uploadsStore.remove(props.hashId)"
    />

    <p class="mb-1 text-slate-400 text-xs">
      {{ sizeInBytes }}
    </p>
    <h1 class="text-slate mb-1" :data-hash-id="props.hashId">
      {{ upload.originalFilename }}
    </h1>

    <hr class="text-slate-200 my-3">

    <p class="text-slate-600 text-sm mb-3">
      Extracted from file name
    </p>

    <stacked-list-item name="Title" :value="extractReceiptTitle(upload.originalFilename)" />
    <stacked-list-item name="Date" :value="extractReceiptDate(upload.originalFilename)" />
    <stacked-list-item name="Total" :value="extractReceiptTotal(upload.originalFilename)" />
    <stacked-list-item name="Tags" :value="extractHashtags(upload.originalFilename)" />
    <div class="mt-6 flex items-center gap-3">
      <UButton
        color="neutral"
        :variant="uploadsStore.canStartUpload ? 'soft' : 'outline'"
        class="cursor-pointer"
        :disabled="!uploadsStore.canStartUpload"
        icon="i-lucide-upload"
        @click="uploadsStore.startUpload(props.hashId)"
      >
        Upload
      </UButton>
      <p v-if="!uploadsStore.canStartUpload" class="text-slate-500 text-xs">
        Max concurrent uploads reached.
      </p>
    </div>
  </article>
</template>
