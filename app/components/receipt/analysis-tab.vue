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
          <div>
            <div class="grid grid-cols-2 gap-0">
              <div class="py-1 text-slate-500 text-sm">
                Analyzed At
              </div>
              <div class="py-1.5 text-sm text-right">
                {{ timestampUtils.toShortDate(upload?.analyzedAt) }}
              </div>
              <div class="py-1.5 text-slate-500 text-sm">
                Analysis Status
              </div>
              <div class="py-1 text-right">
                <UBadge
                  :label="upload?.analysisStatus"
                  :color="badgeStyleHelpers.statusBadgeColor(upload?.analysisStatus)"
                  :variant="badgeStyleHelpers.statusBadgeVariant(upload?.analysisStatus)"
                  class="capitalize"
                />
              </div>
            </div>
            <hr class="my-3 border-slate-200">
            <data-key-value-table :items="totals" currency="€" />
            <hr class="my-3 border-slate-200">
          </div>
          <div>
            <data-key-value-table :items="dates" />
            <hr class="my-3 border-slate-200">

            <p class="text-sm text-slate-500 mb-1">
              Merchant
            </p>
            <analysis-merchant-info :merchant="validatedFields.merchant" class="mb-4" />
          </div>
        </div>

        <!-- Items Table -->
        <receipt-items-table
          :items="validatedFields.items.items"
          :has-quantity="validatedFields.items.hasQuantity"
          :subtotal="validatedFields.items.subtotal"
        />
      </div>

      <!-- Raw JSON (for debugging) -->
      <h1 class="my-3 text-lg font-bold text-blue-700">
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
