<script setup>
// eslint-disable vue/multi-word-component-names
const props = defineProps({
  receipt: Object,
})

const route = useRoute()
const router = useRouter()

const tabItems = [
  {
    label: 'Overview',
    value: 'overview',
    slot: 'overview',
  },
  {
    label: 'Analysis',
    value: 'analysis',
    slot: 'analysis',
  },
  {
    label: 'Raw JSON',
    value: 'raw-json',
    slot: 'rawJson',
  },
]

const activeTab = computed({
  get () {
    return (route.query.tab) || 'overview'
  },
  set (tab) {
    router.push({
      path: route.path,
      query: { tab },
    })
  },
})

const schemaCheck = zodSchemas.receiptSchema.safeParse(props.receipt)
if (!schemaCheck.success) {
  console.error('Receipt schema validation failed:', schemaCheck.error)
}

const toast = useToast()
const isAnalyzing = ref(false)
const hasUploads = computed(() => props.receipt.uploads?.length > 0)
const canAnalyze = computed(() => hasUploads.value && !props.receipt.isAnalyzed)

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
  <div class="mt-3">
    <!-- Receipt Title Row -->
    <div class="flex items-center justify-between mb-2 ml-4">
      <h1 class="font-bold text-3xl">
        <template v-if="props.receipt.title">
          {{ props.receipt.title }}
        </template>
        <template v-else>
          {{ `Receipt #${props.receipt.id}` }}
        </template>
      </h1>
      <div class="flex items-center gap-2">
        <UButton
          color="info"
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
          color="neutral"
          variant="subtle"
          class="hover:cursor-pointer"
        >
          Edit
        </UButton>
      </div>
    </div>

    <div class="grid grid-cols-4 gap-4">
      <div id="main-col" class="col-span-3">
        <!-- Tabs -->
        <UTabs
          v-model="activeTab"
          :items="tabItems"
          size="xl"
          variant="link"
          class="w-full"
          :ui="{ indicator: 'border-b-3 border-primary', trigger: 'cursor-pointer' }"
        >
          <!-- Overview Tab -->
          <!-- eslint-disable-next-line vue/no-unused-vars -->
          <template #overview="{ item }">
            <UAlert
              v-if="!schemaCheck.success"
              title="Schema Validation Error"
              description="The receipt data does not match the expected schema. Some fields may not display correctly."
              class="my-5"
              color="warning"
              variant="subtle"
              icon="i-lucide-triangle-alert"
            />
            <!-- <ReceiptOverviewTab :receipt="receipt" /> -->
            <receipt-overview-tab :receipt="receipt" />
          </template>

          <!-- eslint-disable-next-line vue/no-unused-vars -->
          <template #analysis="{ item }">
            <receipt-analysis-tab :receipt="receipt" />
          </template>

          <!-- eslint-disable-next-line vue/no-unused-vars -->
          <template #rawJson="{ item }">
            <receipt-raw-json-tab :receipt="receipt" />
          </template>
        </UTabs>
      </div>
      <div id="side-col" class="mt-12">
        <receipt-upload-column
          v-if="props.receipt.uploads.length > 0"
          :upload="props.receipt.uploads[0]"
        />
      </div>
    </div><!-- /.grid -->
  </div>
</template>
