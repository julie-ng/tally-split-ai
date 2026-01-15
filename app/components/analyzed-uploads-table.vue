<script setup>
// import { receiptUtils } from '~~/shared/utils/receipt.utils'

const props = defineProps({
  uploads: {
    type: Array,
    required: true,
  },
})

const columns = [
  {
    id: 'hashId',
    accessorKey: 'hashId',
    header: 'Hash ID',
  },
  {
    accessorKey: 'originalFilename',
    header: 'Filename',
  },
  // {
  //   accessorKey: 'transactionDateTime',
  //   header: 'Purchased',
  //   cell: ({ row }) => {
  //     const date = row.getValue(transactionDate);
  //     const time = row.getValue(transactionTime);
  //     return `${date}, ${time}`;
  //   }
  // },
  {
    accessorKey: 'transactionDate',
    header: 'Date',
    cell: ({ row }) => {
      const d = row.getValue('transactionDate')
      return (d === '-')
        ? d
        : dateUtils.formatISODate(d)
    },
  },
  // {
  //   accessorKey: 'transactionTime',
  //   header: 'Time',
  //   // cell: ({row}) => `${row.getValue('transactionTime')}`
  // },
  {
    accessorKey: 'azureTags',
    header: 'Blob Tags (filtered)',
  },
  // {
  //   accessorKey: 'tax',
  //   header: 'Tax'
  // },
  {
    accessorKey: 'total',
    header: 'Total',
  },
]

const rows = computed(() => {
  return props.uploads.map(upload => ({
    hashId: upload.hashId,
    originalFilename: upload.originalFilename,
    transactionDate: upload.azureAI.summary.receipt?.transactionDate?.value || '-',
    transactionTime: upload.azureAI.summary.receipt?.transactionTime?.value || '-',
    azureTags: upload.azureTags,
    total: upload.azureAI.summary.receipt.total?.value?.amount || '-',
    tax: upload.azureAI.summary.receipt?.totalTax?.value?.amount || '-',
  }))
})

const tagsToFilter = [
  'receipt-total',
  'receipt-date',
]
</script>

<template>
  <div>
    <!-- <pre><code>{{ rows }}</code></pre> -->

    <UTable :columns="columns" :data="rows" class="flex-1">
      <!-- <template #hashId-cell="{ row }">
      {{ row.hashId }}
     </template>
     <template #originalFilename-cell="{ row }">
      {{ row.originalFilename }}
     </template>

     <template #tax-cell="{ row }">
      {{ row.tax }}
     </template>
    -->

      <template #azureTags-cell="{ row }">
        <azure-blob-tags :tagsAsString="row.original.azureTags" :filter="tagsToFilter" />
      </template>
      <template #hashId-cell="{ row }">
        <NuxtLink :to="`/uploads/${row.original.hashId}`" class="text-primary hover:underline">
          {{ row.original.hashId }}
        </NuxtLink>
      </template>
      <template #total-cell="{ row }">
        {{ receiptUtils.formatCurrency(row.original.total) }}
      </template>
    </UTable>

  <!-- <UTable :columns="columns" :data="rows" class="flex-1">
    <template #hashId="{ row }">
      <NuxtLink :to="`/uploads/${row.hashId}`" class="text-primary hover:underline">
        {{ row.hashId }}
      </NuxtLink>
    </template>
  </UTable> -->
  </div>
</template>
