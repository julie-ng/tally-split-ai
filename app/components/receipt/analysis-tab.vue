<script setup>
const props = defineProps({
  receipt: Object,
})

// Get upload hashId for fetching analysis
const uploadHashId = computed(() => props.receipt.uploads?.[0]?.hashId)

// Fetch analysis data
const { data: analysisData, pending, error } = await useFetch(
  () => `/api/analysis/summary/${uploadHashId.value}`,
  {
    key: `analysis-${uploadHashId.value}`,
    immediate: !!uploadHashId.value,
  },
)

const is404 = computed(() => error.value?.statusCode === 404)
const is500 = computed(() => error.value?.statusCode === 500)

// Validate analysis data
const validation = computed(() => zodSchemas.analysisSummarySchema.safeParse(analysisData.value?.data?.azureAI?.summary))
const isValid = computed(() => validation.value.success)
const validatedFields = computed(() => validation.value.success ? validation.value.data : null)

// Computed data for header display
const dates = computed(() => {
  if (!validatedFields.value) return []
  return [
    {
      key: 'Receipt Date',
      value: dateUtils.formatISODate(validatedFields.value.receipt.transactionDate.value),
    },
    {
      key: 'Receipt Time',
      value: dateUtils.timeWithoutSeconds(validatedFields.value.receipt.transactionTime.value),
    },
  ]
})

const totals = computed(() => {
  if (!validatedFields.value) return []
  return [
    {
      key: 'Subtotal',
      value: validatedFields.value.receipt.taxDetails?.value?.[0]?.valueObject?.NetAmount?.valueCurrency?.amount,
    },
    {
      key: 'Tax',
      value: validatedFields.value.receipt.totalTax?.value?.amount || '',
    },
    {
      key: 'Tip',
      value: '-',
    },
    {
      key: 'Total',
      value: validatedFields.value.receipt.total?.value?.amount || '',
    },
  ]
})

// Get analysis metadata from upload
const upload = computed(() => props.receipt.uploads?.[0])
</script>

<template>
  <div class="pt-6 px-4">
    <!-- No uploads -->
    <UAlert
      v-if="!uploadHashId"
      title="No Upload Available"
      description="This receipt has no uploaded image to analyze."
      class="my-5"
      color="warning"
      variant="subtle"
      icon="i-lucide-image-off"
    />

    <!-- Loading -->
    <loading-placeholder v-else-if="pending" title="Loading Analysis" />

    <!-- Error: Cannot Load Data -->
    <UAlert
      v-else-if="error"
      title="Error Loading Analysis"
      class="my-5"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
    >
      <template #description>
        <div v-if="is404">
          <p>Analysis results not found. Run the analysis to generate results.</p>
        </div>
        <div v-else-if="is500">
          <p>Internal Server Error</p>
          <p>Please try again later.</p>
        </div>
        <div v-else>
          <p>Unknown Error</p>
          <p>Check the console for more details.</p>
        </div>
      </template>
    </UAlert>

    <!-- Analysis data -->
    <div v-else-if="analysisData?.success">
      <!-- Validation Error -->
      <UAlert
        v-if="!isValid"
        title="Invalid Data Structure"
        color="error"
        variant="subtle"
        icon="i-lucide-triangle-alert"
      >
        <template #description>
          <pre><code>{{ validation.error }}</code></pre>
        </template>
      </UAlert>

      <!-- Valid Analysis Content -->
      <div v-else-if="validatedFields">
        <!-- Analysis Header -->
        <div class="grid grid-cols-2 gap-x-20">
          <!-- Column 1 -->
          <div>
            <p class="font-semibold mb-2 text-primary-700">
              Analysis
            </p>
            <div class="grid grid-cols-2 gap-0">
              <div class="py-1 text-slate-500 text-sm">
                Analysis Date
              </div>
              <div class="py-1.5 text-sm text-right">
                {{ timestampUtils.toShortDate(upload?.analyzedAt) }}
              </div>
            </div>

            <!-- Extracted Info -->
            <USeparator class="my-3" />
            <p class="font-semibold my-2 text-primary-700">
              Transaction Info <analyzed-by-ai-icon />
            </p>
            <!-- Receipt Date, time -->
            <data-key-value-table :items="dates" />
            <USeparator class="my-3" />

            <!-- Totals -->
            <data-key-value-table :items="totals" currency="€" />
            <USeparator class="my-3" />

            <!-- Azure Blob Tags -->
            <p class="font-semibold mt-2 mb-3 text-primary-700">
              Azure Blob Tags
              <analyzed-by-human-icon color="text-slate-400" />
            </p>
            <blob-tags
              v-if="upload?.azureTags"
              :tags="upload.azureTags"
            />
            <p v-else class="text-slate-400 text-sm">
              No tags
            </p>
            <USeparator class="mt-5 mb-3" />

            <!-- Merchant -->
            <p class="font-semibold my-2 text-primary-700">
              Merchant
              <analyzed-by-ai-icon />
            </p>
            <analysis-merchant-info :merchant="validatedFields.merchant" class="mb-4" />
            <USeparator class="my-3" />
          </div>

          <!-- Column 2 -->
          <div>
            <!-- Items Table -->
            <!-- Line Items -->
            <!-- <hr class="my-0 border-slate-300 border-dashed"> -->

            <ui-collapsible-property-group class="py-2">
              <template #title>
                <p class="font-semibold text-primary-700">
                  Line Items <analyzed-by-ai-icon />
                </p>
              </template>
              <receipt-items-table
                :items="validatedFields.items.items"
                :has-quantity="validatedFields.items.hasQuantity"
                :subtotal="validatedFields.items.subtotal"
              />
            </ui-collapsible-property-group>

            <USeparator class="my-0" />

            <!-- OCR Analysis -->
            <ui-collapsible-property-group class="py-2" :is-open="false">
              <template #title>
                <p class="font-semibold text-primary-700">
                  OCR Analysis <analyzed-by-ai-icon />
                </p>
              </template>
              <ui-file-property label="Status" :text="upload?.analysisStatus" />
              <ui-file-property v-if="upload?.analyzedAt" label="Analyzed At" :text="timestampUtils.toShortDate(upload.analyzedAt)" />
              <ui-file-property v-if="upload?.ocrText" label="OCR Result">
                <ClientOnly>
                  <pre class="w-fit mt-1 p-5 bg-slate-100 rounded-lg font-mono text-sm">{{ upload.ocrText }}</pre>
                </ClientOnly>
              </ui-file-property>
            </ui-collapsible-property-group>

            <USeparator class="my-0" />
          </div>
        </div><!-- /.grid -->
      </div>

      <!-- Raw JSON (for debugging) -->
      <h1 class="mt-2 mb-3 font-semibold text-blue-700">
        Analysis JSON
      </h1>
      <div class="bg-slate-50 p-4 rounded">
        <vue-json-pretty
          :data="analysisData.data"
          :indent="2"
          :deep="4"
          :show-icon="true"
          :show-length="true"
        />
      </div>
    </div>

    <!-- No Analysis Data -->
    <UAlert
      v-else
      title="No Analysis Data"
      description="Analysis results file not found"
      class="my-5"
      color="warning"
      variant="subtle"
      icon="i-lucide-info"
    />
  </div>
</template>
