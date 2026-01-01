<script setup>
import { useUploadsStore } from '~/stores/uploads.store'
const uploadsStore = useUploadsStore()

const props = defineProps({
  hashId: String
})

// Get the upload from the store
const upload = computed(() =>
  uploadsStore.completed.find(u => u.hashId === props.hashId)
)

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

  <hr class="text-slate-200 my-3">

  <p class="mb-1 text-xs uppercase text-slate-400">Azure Blob Name</p>
  <p class="mb-3 text-sm">
    <a :href="upload.blobUrl"
       target="_blank"
       class="text-blue-600 hover:text-blue-800 hover:underline">
      {{ upload.azureFilename }}
    </a>
  </p>

  <p class="mb-1 text-xs uppercase text-slate-400">Blob URL</p>
  <p class="mb-3 text-sm text-ellipsis text-slate-600">
    {{ upload.blobUrl }}
  </p>
</article>
</template>
