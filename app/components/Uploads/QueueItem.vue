<script setup>
import { useUploadQueueStore } from '~/stores/uploads-queue'
const uploadQueueStore = useUploadQueueStore()

const props = defineProps({
  hashId: String,
  name: String,           // "example.jpg"
  size: Number,           // 1024000 (bytes)
  type: String,           // "image/jpeg"
  lastModified: Number,   // 1703847600000 (timestamp)
});

// const lastModified = new Date(props.lastModified)
const sizeInBytes = formatBytes(props.size)

function removeFromQueue(evt) {
  uploadQueueStore.remove(props.hashId)
}
</script>

<template>
  <article class="my-4 p-5 bg-white border-slate-200 border-solid border rounded-md">
    <UButton color="neutral" variant="ghost"
      class="float-right text-slate-500 hover:bg-orange-100 hover:text-orange-500 cursor-pointer"
      @click="removeFromQueue">
      <UIcon name="i-lucide-x" class="size-5" />
    </UButton>

    <p class="mb-1 text-slate-400 text-xs">
      {{ sizeInBytes }}
    </p>
    <h1 class="text-slate mb-1" :data-hash-id="props.hashId">
      {{ props.name }}
    </h1>

    <hr class="text-slate-200 my-3">

    <p class="text-slate-600 text-sm mb-3">Extracted from file name</p>

    <StackedListItem name="Title" :value="extractReceiptTitle(props.name)" />
    <StackedListItem name="Date" :value="extractReceiptDate(props.name)" />
    <StackedListItem name="Total" :value="extractReceiptTotal(props.name)" />
    <StackedListItem name="Tags" :value="extractHashtags(props.name)" />
  </article>
</template>
