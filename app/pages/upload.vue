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
    const id = simpleHash(file.name)

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

    const fileObject = {
      id,
      originalFilename: file.name,
      azureFilename: result.filename,
      blobUrl: result.blob.url,
      blobUploadUrl: result.blob.uploadUrl,
      file
    }
    queueStore.add(id, fileObject)
  })
}
</script>

<template>
  <UContainer>
    <div class="my-5">
      <h1 class="font-bold text-3xl">Upload</h1>
      <p class="mt-1 mb-10 text-slate-400">(work in progress)</p>
      <UploadsDropZone @onUpdate="onFilesUpdate" />
      <UploadsQueue />
    </div>
  </UContainer>
</template>
