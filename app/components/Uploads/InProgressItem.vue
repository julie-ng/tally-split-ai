<script setup>
import { useUploadQueueStore } from '~/stores/uploads-queue'
const uploadQueueStore = useUploadQueueStore()

const props = defineProps({
  hashId: String,
  originalName: String,
  azureName: String,
  size: Number,
  uploadUrl: String,
  uploadExpiresAt: String,
  originalFilename: String
})

const sizeInBytes = formatBytes(props.size)

function returnToQueue(evt) {
  evt.preventDefault()
  uploadQueueStore.returnToQueue(props.hashId)
}
</script>

<template>
<article class="my-4 p-5 bg-white border-slate-200 border-solid border rounded-md">
  <p class="mb-1 text-slate-400 text-xs">
    {{ sizeInBytes }}
  </p>
  <h1 class="text-slate font-semibold mb-3" :data-hash-id="props.hashId">
    {{ props.originalName }}
  </h1>
  <hr class="text-slate-200 my-3">
  <p class="mb-1 text-xs uppercase text-slate-400">Azure Blob Name</p>
  <p class="mb-3 text-sm text-slate-600">
    {{ props.azureName }}
  </p>

  <p class="mb-1 text-xs uppercase text-slate-400">Upload Expires At</p>
  <p class="mb-3 text-sm text-ellipsis text-slate-600">{{ props.uploadExpiresAt }}</p>

  <p class="mb-1 text-xs uppercase text-slate-400">Upload Url</p>
  <p class="mb-3 text-sm text-ellipsis text-slate-600">{{ props.uploadUrl }}</p>

  <div class="mt-6">
    <UButton color="neutral" variant="soft"
      class="cursor-pointer"
      @click="returnToQueue"
      >Return to Queue
    </UButton>
  </div>
</article>
</template>
