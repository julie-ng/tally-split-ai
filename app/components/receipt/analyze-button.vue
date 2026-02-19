<script setup>
import { useReceiptsStore } from '~/stores/receipts.store'

const props = defineProps({
  id: {
    type: Number,
    required: true,
  },
  canAnalyze: {
    type: Boolean,
    required: true,
  },
})

const receiptsStore = useReceiptsStore()
const toast = useToast()

const isAnalyzing = computed(() => receiptsStore.isReceiptAnalyzing(props.id))

async function handleAnalyze () {
  try {
    await receiptsStore.analyzeReceipt(props.id)
    // Refresh analysis tab data (keyed by uploadHashId in analysis-tab.vue)
    const hashId = receiptsStore.getUploadHashId(props.id)
    if (hashId) {
      await refreshNuxtData(`analysis-${hashId}`)
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
