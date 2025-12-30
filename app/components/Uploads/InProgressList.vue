<script setup>
import { useUploadQueueStore } from '~/stores/uploads-queue'
const queueStore = useUploadQueueStore()

const MAX_IN_PROGRESS = 1 // TODO

</script>
<template>
<div>
  <section>
    <UploadsInProgressItem
      v-for="item in queueStore.inProgress"
      :key="`in-progress-${item.hashId}`"
      :hashId="item.hashId"
      :size="item.size"
      :azureName="item.azureFilename"
      :originalName="item.originalFilename"
      :uploadUrl="item.upload.url"
      :uploadExpiresAt="item.upload.expiresAt"
    >
    </UploadsInProgressItem>
  </section>
</div>
</template>
