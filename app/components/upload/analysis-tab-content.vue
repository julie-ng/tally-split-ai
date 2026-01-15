<script setup>
// import { z } from 'zod'

/**
 * Component Properties
 */
const props = defineProps({
  upload: Object, // should inherit valid schema
  analysisData: Object,
  analysisPending: Boolean,
  analysisError: Object,
})

// Rename to match template usage
const pending = computed(() => props.analysisPending)
const error = computed(() => props.analysisError)

const is404 = computed(() => error.value?.statusCode === 404)
const is500 = computed(() => error.value?.statusCode === 500)

// Do Validation
const validation = computed(() => zodSchemas.analysisSummarySchema.safeParse(props.analysisData?.data?.azureAI?.summary))
const isValid = computed(() => validation.value.success)
const validatedFields = computed(() => validation.value.success ? validation.value.data : null)
</script>

<template>
  <div class="pt-6 px-4">
    <!-- <div class="mb-4">
    <p>Analysis Status: {{ upload.analysisStatus }}</p>
    <p v-if="upload.analyzedAt">
      Analyzed At: {{ timestampUtils.toShortDate(upload.analyzedAt) }}
    </p>
  </div> -->

    <!-- Loading: Data state -->
    <loading-placeholder v-if="pending" title="Loading Analysis" />

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
          <p>Analysis results not found. Please run the analysis (TODO: show button)</p>
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
    <div v-else-if="props.analysisData?.success">
      <!-- Analysis Header -->
      <!-- :description="validation.error" -->
      <UAlert
        v-if="!isValid"
        title="Invalid Data Structure"
        color="error"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        description="foooo bar"
      >
        <template #description>
          <pre><code>{{ validation.error }}</code></pre> <!-- Temp: not sure why this is a string -->
        </template>
      </UAlert>
      <div v-else-if="validatedFields">
        <upload-analysis-tab-content-header
          :analysisStatus="upload.analysisStatus"
          :analyzedAt="upload.analyzedAt"
          :fields="validatedFields"
        />

        <!-- Items Table -->
        <ReceiptItemsTable
          :items="validatedFields.items.items"
          :hasQuantity="validatedFields.items.hasQuantity"
          :subtotal="validatedFields.items.subtotal"
        />
      </div>

      <!-- Temp? Display raw JSON -->
      <h1 class="my-3 text-lg font-bold text-blue-700">
        Analysis JSON
      </h1>
      <div class="bg-slate-800 p-4">
        <vue-json-pretty
          :data="props.analysisData.data"
          :indent="2"
          :deep="4"
          :showIcon="true"
          :showLength="true"
        />
      </div>
    </div>

    <!-- Not found -->
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
