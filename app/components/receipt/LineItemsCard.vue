<script setup>
import { useUploadsStore } from '~/stores/uploads.store'

// Line items inside the expense preview's Receipt tab.
//
// Named Receipt* even though it reads the UPLOAD's analysis: line items are a
// property of the receipt as a document, and that is how a reader looks for
// them. The uploadId prop is the plumbing, not the concept.
//
// Source is the analysis SUMMARY (/api/analysis/summary/[id]), not the receipt
// row — the receipt carries totals, never the per-item breakdown.
//
// Keyed off the id via an IMMEDIATE watch, never a bare setup call: this card is
// reused as the preview panel swaps rows without remounting, so a setup-time
// fetch would run once for the first id and silently never re-fetch.
// See rules/vue-component-conventions.md — the reused-leaf trap.
const props = defineProps({
  uploadId: {
    type: String,
    required: true,
  },
})

const uploadsStore = useUploadsStore()

const analysis = ref(null)
const pending = ref(false)

watch(() => props.uploadId, async (id) => {
  if (!id) {
    return
  }
  pending.value = true
  analysis.value = null
  try {
    // Resolves to null on error; the store logs and swallows.
    analysis.value = await uploadsStore.fetchAnalysisById(id)
  }
  finally {
    pending.value = false
  }
}, { immediate: true })

// Validated rather than read raw: the envelope is Azure's shape, and an OCR run
// that half-succeeded can omit `items` entirely.
const items = computed(() => {
  const parsed = zodSchemas.analysisSummarySchema.safeParse(analysis.value?.azureAIDocIntel?.results)
  return parsed.success ? parsed.data.items : null
})

const hasItems = computed(() => items.value?.items?.length > 0)
</script>

<template>
  <UiCollapsibleCard default-open>
    <template #header>
      <span class="text-sm font-medium">
        Line Items
        <span v-if="hasItems" class="text-dimmed">
          ({{ items.items.length }})
        </span>
      </span>
    </template>

    <div v-if="pending" class="space-y-3">
      <USkeleton class="h-4 w-full" />
      <USkeleton class="h-4 w-2/3" />
    </div>

    <p v-else-if="!hasItems" class="text-sm text-dimmed">
      No line items were detected on this receipt.
    </p>

    <ReceiptItemsTable
      v-else
      :items="items.items"
      :has-quantity="items.hasQuantity"
      :subtotal="items.subtotal"
      table-class="w-full text-sm"
    />
  </UiCollapsibleCard>
</template>
