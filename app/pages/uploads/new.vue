<script setup>
useHead({
  title: 'Upload'
})

import { useUserStore } from '~/stores/user.store'
import { useUploadsStore } from '~/stores/uploads.store'
import { useUploadObject } from '~/composables/useUploadObject'

const userStore = useUserStore()
const userId = userStore.userId
const uploadsStore = useUploadsStore()
const { createUploadObject } = useUploadObject()

async function onFilesUpdate(files) {
  for (const file of files) {
    // Generate Blob Url & SAS token for each file
    try {
      const result = await $fetch('/api/blobs/new', {
        method: 'POST',
        body: {
          userId,
          filename: file.name
        }
      })

      // DEBUG: remove later
      // console.table(result)

      const uploadObject = await createUploadObject(file, result)
      uploadsStore.add(uploadObject)

    } catch (error) {
      console.error('❗️ Unable to initialize new blob request')
      console.error(error)
    }
  }
}
</script>

<template>
  <UContainer>
    <div class="my-5">
      <h1 class="font-bold text-3xl">Upload</h1>
      <p class="mt-1 text-slate-400">(work in progress)</p>
      <UploadsDropZone class="mb-10" @onUpdate="onFilesUpdate" />

      <div class="grid grid-cols-3 gap-8">
        <div>
          <h1 class="text-lg font-bold">
            Queued
            <span v-if="uploadsStore.hasQueued" class="bg-slate-300 font-normal text-slate-500 inline-block ml-1 w-6 h-6 align-middle text-center text-base/6 rounded-full">
              {{ uploadsStore.totalQueued }}
            </span>
          </h1>
          <UploadsQueueList />
        </div>
        <div>
          <h1 class="text-lg font-bold">
            In Progress
            <span v-if="uploadsStore.hasInProgress" class="bg-slate-300 font-normal text-slate-500 inline-block ml-1 w-6 h-6 align-middle text-center text-base/6 rounded-full">
              {{ uploadsStore.totalInProgress }}
            </span>
          </h1>
          <UploadsInProgressList />
        </div>
        <div>
          <h1 class="text-lg font-bold">Complete</h1>
          <UploadsCompletedList />
        </div>
      </div>
      <!--
      <hr>
      <pre class="p-6 bg-slate-600 text-slate-100"><code>{{ uploadsStore.queued }}</code></pre>
      -->
    </div>
  </UContainer>
</template>
