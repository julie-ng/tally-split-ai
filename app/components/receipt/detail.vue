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
  {
    label: 'History',
    value: 'history',
    slot: 'history',
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

// Shared highlight state for cross-highlighting between image overlay and analysis table
const { highlightedLabel } = useHighlightedLabel()
provide('highlightedLabel', highlightedLabel)
</script>

<template>
  <div class="mt-3">
    <!-- Receipt Title Row -->
    <receipt-detail-title
      :id="props.receipt.id"
      :title="props.receipt.title"
      :is-analyzed="props.receipt.analysisStatus === 'analyzed'"
      :has-uploads="props.receipt.uploads?.length > 0"
    />

    <div class="grid grid-cols-4 gap-4">
      <div id="main-col" class="col-span-3">
        <!-- Tabs -->
        <UTabs
          v-model="activeTab"
          :items="tabItems"
          size="xl"
          variant="link"
          class="w-full"
          color="primary"
          :ui="{ indicator: 'border-b-3 border-primary-700', trigger: 'cursor-pointer' }"
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

          <!-- eslint-disable-next-line vue/no-unused-vars -->
          <template #history="{ item }">
            <receipt-history-tab :receipt="receipt" />
          </template>
        </UTabs>
      </div>
      <div id="side-col" class="mt-12">
        <receipt-upload-column
          v-if="props.receipt.uploads?.length > 0"
          :hash-id="props.receipt.uploads[0]?.hashId"
        />
      </div>
    </div><!-- /.grid -->
  </div>
</template>
