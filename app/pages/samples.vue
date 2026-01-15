<script setup>
useHead({
  title: 'Sample Files',
})

const { data: sampleReceipts, error } = await useFetch('/api/sample-receipts')
</script>

<template>
  <UContainer>
    <div class="my-5">
      <h1 class="mt-8 mb-1 font-bold text-3xl">
        Sample Scans
      </h1>
      <p class="mb-5">
        Pulled from the <code>~/scans/excerpt</code> folder.
      </p>

      <div v-if="error" class="notification is-danger">
        Error loading sample receipts: {{ error }}
      </div>

      <div v-else-if="sampleReceipts">
        <section class="grid col-start-1 row-start-1 grid-cols-4 gap-4 rounded-lg">
          <article v-for="receipt in sampleReceipts.receipts" :key="receipt.filename" class="">
            <samples-scan-card
              :title="receipt.title"
              :filename="receipt.filename"
              :date="receipt.date"
              :total="receipt.total"
              :tags="receipt.tags"
            />
          </article>
        </section>
      </div>
    </div>
  </UContainer>
</template>
