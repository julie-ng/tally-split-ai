<script setup>
import { useReceiptsStore } from '~/stores/receipts.store'

useHead({ title: 'Lab: Handwriting Detection' })

const receiptsStore = useReceiptsStore()

await callOnce('receipts', async () => {
  await receiptsStore.fetchReceipts()
}, { mode: 'navigation' })

// Local state
const selectedReceiptId = ref(null)
const result = ref(null)
const loading = ref(false)
const error = ref(null)
const existingResult = ref(false)

// Receipt picker options
const receiptOptions = computed(() =>
  receiptsStore.allReceipts.map(r => ({
    label: `#${r.id} — ${r.merchantName || r.uploads?.[0]?.originalFilename || 'Unknown'}`,
    value: r.id,
  })),
)

// Derived from selection
const selectedReceipt = computed(() =>
  selectedReceiptId.value
    ? receiptsStore.getReceiptById(selectedReceiptId.value)
    : null,
)

const uploadHashId = computed(() =>
  selectedReceiptId.value
    ? receiptsStore.getUploadHashId(selectedReceiptId.value)
    : null,
)

const blobName = computed(() =>
  selectedReceipt.value?.uploads?.[0]?.blobName || null,
)

// Check for existing handwriting analysis when selection changes
watch(uploadHashId, async (hashId) => {
  result.value = null
  error.value = null
  existingResult.value = false

  if (!hashId) return

  const data = await $fetch(`/api/analysis/handwriting/${hashId}`)
  if (data.success) {
    result.value = data
    existingResult.value = true
  }
})

// Run GPT-4o handwriting analysis
async function runHandwritingAnalysis () {
  loading.value = true
  error.value = null
  result.value = null

  try {
    const data = await $fetch(`/api/analysis/handwriting/${uploadHashId.value}`, {
      method: 'POST',
    })
    result.value = data
  }
  catch (err) {
    error.value = err.data?.message || err.message || 'Handwriting analysis failed'
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <UContainer>
    <h1 class="mb-1 font-bold text-xl">
      Lab: Handwriting Detection
    </h1>
    <p class="mb-4 text-gray-500">
      Test GPT-4o handwriting detection against receipt images
    </p>

    <!-- Receipt picker -->
    <USelectMenu
      v-model="selectedReceiptId"
      :items="receiptOptions"
      value-key="value"
      placeholder="Select a receipt..."
      class="mb-6 max-w-md"
    />

    <!-- Two-column layout when receipt selected -->
    <div v-if="selectedReceiptId" class="grid grid-cols-2 gap-6">
      <!-- Left: Receipt image -->
      <div>
        <blob-image v-if="blobName" :key="blobName" :blob-name="blobName" />
      </div>

      <!-- Right: Controls + Results -->
      <div>
        <UButton
          :loading="loading"
          :disabled="!uploadHashId || existingResult"
          icon="i-lucide-scan-search"
          class="mb-4"
          @click="runHandwritingAnalysis"
        >
          Analyze Handwriting
        </UButton>

        <UAlert
          v-if="existingResult"
          color="info"
          description="Handwriting analysis already exists for this receipt."
          class="mb-4"
        />

        <UAlert
          v-if="error"
          color="error"
          :description="error"
          class="mb-4"
        />

        <ClientOnly>
          <vue-json-pretty
            v-if="result"
            :data="result"
            :deep="3"
            :show-icon="true"
            :show-length="true"
          />
        </ClientOnly>
      </div>
    </div>
  </UContainer>
</template>
