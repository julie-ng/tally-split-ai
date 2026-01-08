<script setup>
import { useUploadsStore } from '~/stores/uploads.store'
const uploadsStore = useUploadsStore()

const props = defineProps({
  hashId: String
})

// Get the upload from the store (check both in-progress and failed)
const upload = computed(() => {
  const inProgress = uploadsStore.inProgress.find(u => u.hashId === props.hashId)
  if (inProgress) return inProgress

  const failed = uploadsStore.failed.find(u => u.hashId === props.hashId)
  return failed
})

const sizeInBytes = computed(() =>
  upload.value ? formatBytes(upload.value.size) : ''
)
</script>

<template>
<article v-if="upload" class="my-4 p-5 bg-white border-slate-200 border-solid border rounded-md">
  <p class="mb-1 text-slate-400 text-xs">
    {{ sizeInBytes }}
  </p>
  <h1 class="text-slate font-semibold mb-3" :data-hash-id="props.hashId">
    {{ upload.originalFilename }}
  </h1>

  <div v-if="upload.status === 'in-progress'" class="mb-3">
    <p class="text-sm text-blue-600 font-medium mb-1">Uploading: {{ upload.upload.progress }}%</p>
    <div class="w-full bg-slate-200 rounded-full h-2">
      <div class="bg-blue-500 h-2 rounded-full transition-all duration-300" :style="{ width: `${upload.upload.progress}%` }"></div>
    </div>
  </div>

  <div v-if="upload.status === 'failed'" class="mb-3 p-3 bg-rose-50 border border-rose-200 rounded">
    <p class="text-rose-700 text-base font-semibold mb-2">Upload Failed</p>
    <ul class="text-xs text-rose-700 mb-3">
      <li v-for="(error, index) in upload.errors" :key="index" class="mb-1">
        • {{ error }}
      </li>
    </ul>
    <UButton
      color="neutral"
      variant="solid"
      class="bg-rose-200 text-rose-900 hover:bg-rose-500 hover:text-white cursor-pointer"
      size="sm"
      @click="uploadsStore.retryUpload(props.hashId)"
      icon="i-lucide-rotate-cw"
    >
      Retry Upload
    </UButton>
  </div>

  <hr class="text-slate-200 my-3">
  <p class="mb-1 text-xs uppercase text-slate-400">Azure Blob Name</p>
  <p class="mb-3 text-sm text-slate-600">
    {{ upload.azureFilename }}
  </p>

  <p class="mb-1 text-xs uppercase text-slate-400">Upload Expires At</p>
  <p class="mb-3 text-sm text-ellipsis text-slate-600">{{ upload.upload.expiresAt }}</p>

  <p class="mb-1 text-xs uppercase text-slate-400">Upload Url</p>
  <p class="mb-3 text-sm text-ellipsis text-slate-600">{{ upload.upload.url }}</p>

  <div class="mt-6">
    <UButton color="neutral" variant="soft"
      class="cursor-pointer"
      @click="uploadsStore.returnToQueue(props.hashId)"
      >Return to Queue
    </UButton>
  </div>
</article>
</template>
