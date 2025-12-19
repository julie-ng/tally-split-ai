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
    tags: extractHashtags(blob.filename),
    sasUrl: blob.sasUrl,
    uploadedAt: blob.uploadedAt,
    lastModified: blob.lastModified
  }))
})
</script>

<template>
<div class="container">
  <div class="content my-5">
    <h1 class="has-text-weight-bold">Azure Blob Storage</h1>
    <p v-if="blobsData">
      Container: <code>{{ blobsData.containerName }}</code>
      ({{ blobsData.count }} blob{{ blobsData.count !== 1 ? 's' : '' }})
    </p>

    <div v-if="error" class="notification is-danger">
      Error loading blobs: {{ error }}
    </div>

    <div v-else-if="receipts.length > 0">
      <section class="fix-grid has-auto-count">
        <div class="grid">
          <article v-for="receipt in receipts" :key="receipt.filename" class="cell">
            <scan-card :title="receipt.title" :filename="receipt.filename" :date="receipt.date" :total="receipt.total"
              :tags="receipt.tags" :image-url="receipt.sasUrl">
            </scan-card>
          </article>
        </div>
      </section>
    </div>

    <div v-else-if="!error" class="notification is-info">
      No blobs found in the container.
    </div>
  </div>
</div>
</template>
