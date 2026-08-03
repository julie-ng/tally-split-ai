<script setup>
import { useExpensesStore } from '~/stores/expenses.store'
import { useReceiptsStore } from '~/stores/receipts.store'

// Receipt tab of the expense preview. Composes the cards; each one self-fetches
// from the id it is given, so this component only resolves ids:
//   expenseId (prop) → expense.receiptId → receipt.uploadId
//
// The receipt is read here ONLY to reach uploadId and to gate the loading state.
// Everything upload-shaped — blob name, size, analyzed-at, the image — belongs to
// BlobOverviewCard, which owns the uploads-store lookup. That split matters:
// /api/receipts (list) and /api/receipts/[id] project differently into the same
// store cache, so a list-cached receipt carries no `upload` sub-object.
//
// Line items, OCR text and the polygon overlay are NOT here: cross-highlighting
// needs the table and the image side by side, which this single narrow column
// can't give them. They live in BlobLineItemsModal, opened by clicking the image
// in BlobOverviewCard.
const props = defineProps({
  expenseId: {
    type: String,
    required: true,
  },
})

const expensesStore = useExpensesStore()
const receiptsStore = useReceiptsStore()

const expense = computed(() => expensesStore.getExpenseById(props.expenseId))
const receiptId = computed(() => expense.value?.receiptId)

const receipt = computed(() => receiptId.value
  ? receiptsStore.getReceiptById(receiptId.value)
  : null,
)

// The receipt load is kicked off by useExpensePreview on open; still pending if
// it's linked but not yet in the store.
const receiptPending = computed(() => !!receiptId.value && !receipt.value)

// Only to route the id into BlobOverviewCard, which owns the upload fetch and
// everything rendered from it.
const uploadId = computed(() => receipt.value?.uploadId)
</script>

<template>
  <div class="px-4 py-6">
    <!-- No receipt linked to this expense -->
    <div v-if="!receiptId" class="text-sm text-muted py-6 text-center">
      No receipt attached to this expense.
    </div>

    <!-- Receipt still loading -->
    <div v-else-if="receiptPending" class="space-y-3">
      <USkeleton class="h-5 w-1/2" />
      <USkeleton class="h-4 w-2/3" />
      <USkeleton class="h-4 w-1/3" />
      <USkeleton class="w-3/4 mx-auto aspect-3/4 rounded-lg" />
    </div>

    <!-- Receipt loaded -->
    <div v-else-if="receipt" class="space-y-5">
      <div>
        <h1 class="flex items-baseline justify-between gap-3 text-sm font-bold text-default">
          {{ receipt.merchantName || 'Receipt' }}
        </h1>

        <p v-if="receipt.merchantAddress" class="mt-1 text-muted font-normal text-sm">
          {{ receipt.merchantAddress }}
        </p>
      </div>

      <ReceiptOverviewCard :receipt-id="receiptId" />

      <!-- Line items and OCR text live in the modal this card's image opens —
           both need width the panel doesn't have. -->
      <BlobOverviewCard v-if="uploadId" :upload-id="uploadId" />
    </div>
  </div>
</template>
