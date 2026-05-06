<script setup>
import { useReceiptsStore } from '~/stores/receipts.store'
import { useUploadsStore } from '~/stores/uploads.store'

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
  canAnalyze: {
    type: Boolean,
    required: true,
  },
})

const receiptsStore = useReceiptsStore()
const uploadsStore = useUploadsStore()
const toast = useToast()

const isAnalyzing = computed(() => receiptsStore.isReceiptAnalyzing(props.id))

async function handleAnalyze () {
  try {
    await receiptsStore.analyzeReceipt(props.id)
    // Invalidate cached analysis so the next view re-fetches fresh OCR data.
    const uploadId = receiptsStore.getUploadId(props.id)
    if (uploadId) {
      uploadsStore.clearAnalysisCacheById(uploadId)
    }
    toast.add({
      title: 'Analysis complete',
      description: 'Receipt has been successfully analyzed.',
      color: 'success',
      icon: 'i-lucide-focus',
    })
  }
  catch {
    toast.add({
      title: 'Analysis failed',
      description: 'Please try again.',
      color: 'error',
      icon: 'i-lucide-circle-x',
    })
  }
}
</script>

<template>
  <UButton
    color="primary"
    variant="solid"
    icon="i-lucide-focus"
    :disabled="!canAnalyze || isAnalyzing"
    :loading="isAnalyzing"
    class="hover:cursor-pointer"
    @click="handleAnalyze"
  >
    Analyze
  </UButton>
</template>
