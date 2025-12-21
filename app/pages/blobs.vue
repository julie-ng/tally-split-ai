<script setup>
useHead({
  title: 'Azure Blobs'
})

const { data: blobsData, error } = await useFetch('/api/blobs')

const receipts = computed(() => {
  if (!blobsData.value?.blobs) return []

  return blobsData.value.blobs.map(blob => ({
    filename: blob.filename,
    title: extractReceiptTitle(blob.filename),
    date: extractReceiptDate(blob.filename),
    total: extractReceiptTotal(blob.filename),
    tags: extractHashtags(blob.filename), // TODO: should be Azure Tags
    sasUrl: blob.sasUrl,
    uploadedAt: blob.uploadedAt,
    lastModified: blob.lastModified
  }))
})
</script>

<template>
<UContainer>
  <div class="content my-5">
    <h1 class="mt-8 mb-1 font-bold text-3xl">Azure Blob Storage</h1>
    <p v-if="blobsData" class="mb-5">
      Container: <code>{{ blobsData.containerName }}</code>
      ({{ blobsData.count }} blob{{ blobsData.count !== 1 ? 's' : '' }})
    </p>

    <div v-if="error" class="notification is-danger">
      Error loading blobs: {{ error }}
    </div>

    <div v-else-if="receipts.length > 0">
      <section class="grid col-start-1 row-start-1 grid-cols-4 gap-4 rounded-lg">
        <article v-for="receipt in receipts" :key="receipt.url">
          <ScanCard :title="receipt.title" :filename="receipt.filename" :date="receipt.date" :total="receipt.total"
            :tags="receipt.tags" :image-src="receipt.sasUrl" :image-link="receipt.sasUrl">
          </ScanCard>
        </article>
      </section>
    </div>

    <div v-else-if="!error" class="notification is-info">
      No blobs found in the container.
    </div>
  </div>

</UContainer>
</template>
