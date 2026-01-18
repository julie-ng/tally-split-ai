<script setup>
const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  id: {
    type: Number,
    required: true,
  },
  isAnalyzed: {
    type: Boolean,
    required: true,
  },
  hasUploads: {
    type: Boolean,
    required: false,
    default: true,
  },
})

const toast = useToast()

/**
 * Analysize Receipt
 */
const isAnalyzing = ref(false)
const canAnalyze = computed(() => props.hasUploads && !props.isAnalyzed)

const analyzeReceipt = async () => {
  const hashId = props.receipt.uploads?.[0]?.hashId
  if (!hashId) {
    console.error('No upload hashId found for receipt')
    return
  }

  isAnalyzing.value = true
  try {
    await $fetch(`/api/analysis/${hashId}`, {
      method: 'POST',
    })

    toast.add({
      title: 'Analysis complete',
      description: 'Receipt has been successfully analyzed.',
      color: 'success',
      icon: 'i-lucide-focus',
    })

    // Reload page to show updated analysis data
    setTimeout(() => window.location.reload(), 1000) // TODO: refetch data instead of reload
  }
  catch (error) {
    console.error('Failed to analyze receipt:', error)
    toast.add({
      title: 'Analysis failed',
      description: 'Please try again.',
      color: 'error',
      icon: 'i-lucide-circle-x',
    })
    isAnalyzing.value = false
  }
}
</script>

<template>
  <div class="flex items-center justify-between mb-2 ml-4">
    <h1 class="font-bold text-3xl">
      <template v-if="title">
        {{ title }}
      </template>
      <template v-else>
        {{ `Receipt #${id}` }}
      </template>
      <UBadge
        v-if="isAnalyzed"
        icon="i-lucide-focus"
        color="info"
        variant="outline"
        size="lg"
        class="ml-2"
      >
        Analyzed
      </UBadge>
    </h1>
    <div class="flex items-center gap-2">
      <UButton
        v-if="!isAnalyzed"
        color="primary"
        variant="solid"
        icon="i-lucide-focus"
        :disabled="!canAnalyze || isAnalyzing"
        :loading="isAnalyzing"
        class="hover:cursor-pointer"
        @click="analyzeReceipt"
      >
        Analyze
      </UButton>
      <UButton
        icon="i-lucide-pencil"
        color="secondary"
        variant="solid"
        class="hover:cursor-pointer"
      >
        Edit
      </UButton>
    </div>
  </div>
</template>
