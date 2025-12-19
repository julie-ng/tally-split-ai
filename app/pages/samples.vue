<script setup>
useHead({
  title: 'Sample Files'
})

const { data: sampleReceipts, error } = await useFetch('/api/sample-receipts')
</script>

<template>
<div class="container">
  <div class="content my-5">
    <h1 class="has-text-weight-bold">Sample Scans</h1>
    <p>Pulled from the <code>~/scans/excerpt</code> folder.</p>

    <div v-if="error" class="notification is-danger">
      Error loading sample receipts: {{ error }}
    </div>

    <div v-else-if="sampleReceipts">
      <section class="fix-grid has-auto-count">
        <div class="grid">
          <article v-for="receipt in sampleReceipts.receipts" :key="receipt.filename" class="cell">
            <scan-card :title="receipt.title" :filename="receipt.filename" :date="receipt.date" :total="receipt.total"
              :tags="receipt.tags">
            </scan-card>
          </article>
        </div>
      </section>
    </div>
  </div>
</div>
</template>
