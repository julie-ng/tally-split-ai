<script setup>
import { useExpensesStore } from '~/stores/expenses.store'

const props = defineProps({
  receipt: Object,
})

const expensesStore = useExpensesStore()

const uploadId = computed(() => props.receipt.uploads?.[0]?.id)

// The linked expense isn't reachable from the receipt UI otherwise. The sibling
// <receipt-expense> already warms the receiptId → expenseId mapping into the
// store, so we just read it here. Deep-links the expenses preview panel.
const expenseId = computed(() => expensesStore.getExpenseIdByReceiptId(props.receipt.id))

const dates = computed(() => {
  return [
    {
      key: 'Receipt Date',
      value: dateUtils.formatISODate(props.receipt.date),
    },
  ]
})
</script>

<template>
  <div>
    <div class="grid grid-cols-2 gap-4">
      <!-- [Column 1]: -->
      <div class="px-4 py-2">
        <section>
          <ui-section-subtitle>
            Transaction Details
          </ui-section-subtitle>

          <!-- Merchant Info -->
          <receipt-merchant-info
            v-if="props.receipt.merchantName"
            :name="props.receipt.merchantName"
            :address="props.receipt.merchantAddress"
            :relaxed-line-height="true"
            class="my-4"
          />

          <USeparator class="my-4" />

          <!-- Receipt Dates -->
          <data-key-value-table :items="dates" />
          <USeparator class="my-4" />

          <!-- Receipt Totals -->
          <data-key-value-table :items="receiptUtils.extractTotalsAsArray(receipt)" currency="EUR" />
        </section>

        <USeparator class="my-4" />

        <!-- Expense Costs -->
        <section>
          <ui-section-subtitle>
            Expense Costs
          </ui-section-subtitle>
          <receipt-expense
            :receipt-id="props.receipt.id"
          />
        </section>
      </div>

      <!-- [Column 2]: -->
      <div class="px-4 py-2">
        <!-- Metadata -->
        <section>
          <ui-section-subtitle>
            Receipt
          </ui-section-subtitle>
          <receipt-metadata-info :receipt="receipt" />
        </section>

        <USeparator class="my-4" />

        <!-- Blob Info -->
        <section>
          <ui-section-subtitle>
            Azure Blob Info
          </ui-section-subtitle>
          <blob-info v-if="uploadId" :id="uploadId" />
        </section>
      </div>
    </div>

    <div class="px-4">
      <hr class="my-6 border-default">

      <!-- Edit / View actions -->
      <div class="my-3 flex items-center gap-2">
        <NuxtLink :to="`/receipts/${receipt.id}/edit`">
          <UButton
            icon="i-lucide-pencil"
            color="secondary"
            variant="solid"
            class="hover:cursor-pointer"
          >
            Edit Receipt
          </UButton>
        </NuxtLink>
        <NuxtLink v-if="expenseId" :to="`/expenses?preview=${expenseId}`">
          <UButton
            icon="i-lucide-coins"
            color="neutral"
            variant="outline"
            class="hover:cursor-pointer"
          >
            View Expense
          </UButton>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
