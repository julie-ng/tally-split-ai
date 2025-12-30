<script setup>
useHead({
  title: 'Upload'
})

import { createAzureFilename, simpleHash } from '~~/shared/utils/filename.helper'
import { useUserStore } from '~/stores/user.store'
import { useUploadQueueStore } from '~/stores/uploads-queue'

const userStore = useUserStore()
const userId = userStore.userId
const queueStore = useUploadQueueStore()

function onFilesUpdate(files) {
  files.forEach(async function (file) {
    const hashId = simpleHash(file.name)

    // Generate Blob Url & SAS token for each file
    let result
    try {
      result = await $fetch('/api/blobs/new', {
        method: 'POST',
        body: {
          userId,
          filename: file.name
        }
      })
    } catch (error) {
      console.error('❗️ Unable to initialize new blob request')
      console.error(error)
    }

    // DEBUG: remove later
    console.table(result)

    const uploadObject = {
      hashId,
      originalFilename: file.name,
      azureFilename: result.filename,
      size: file.size,
      blobUrl: result.blob.url,
      upload: {
        url: result.blob.uploadUrl,
        expiresAt: result.blob.uploadExpiresAt
      },
      status: 'queued',
      queuedAt: new Date(),
      file
    }
    queueStore.add(uploadObject)
  })
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
            <span v-if="queueStore.hasQueued" class="bg-slate-300 font-normal text-slate-500 inline-block ml-1 w-6 h-6 align-middle text-center text-base/6 rounded-full">
              {{ queueStore.totalQueued }}
            </span>
          </h1>
          <UploadsQueue />
        </div>
        <div>
          <h1 class="text-lg font-bold">
            In Progress
            <span v-if="queueStore.hasInProgress" class="bg-slate-300 font-normal text-slate-500 inline-block ml-1 w-6 h-6 align-middle text-center text-base/6 rounded-full">
              {{ queueStore.totalInProgress }}
            </span>
          </h1>
          <UploadsInProgressList />
        </div>
        <div>
          <h1 class="text-lg font-bold">Complete</h1>
        </div>
      </div>
      <!--
      <hr>
      <pre class="p-6 bg-slate-600 text-slate-100"><code>{{ queueStore.queued }}</code></pre>
      -->
    </div>
  </UContainer>
</template>
