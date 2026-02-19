<script setup>
import { h, resolveComponent } from 'vue'
import { useReceiptsStore } from '~/stores/receipts.store'

const open = defineModel('open', { type: Boolean, default: false })

const receiptsStore = useReceiptsStore()
const UCheckbox = resolveComponent('UCheckbox')

const unanalyzedReceipts = computed(() =>
  receiptsStore.allReceipts.filter(r => !r.isAnalyzed),
)

const columns = [
  {
    id: 'select',
    header: ({ table }) => h(UCheckbox, {
      'modelValue': table.getIsSomePageRowsSelected() ? 'indeterminate' : table.getIsAllPageRowsSelected(),
      'onUpdate:modelValue': value => table.toggleAllPageRowsSelected(!!value),
      'aria-label': 'Select all',
    }),
    cell: ({ row }) => h(UCheckbox, {
      'modelValue': row.getIsSelected(),
      'onUpdate:modelValue': value => row.toggleSelected(!!value),
      'aria-label': 'Select row',
    }),
  },
  {
    accessorKey: 'id',
    header: 'ID',
  },
  {
    accessorKey: 'filename',
    header: 'Filename',

  },
  {
    accessorKey: 'createdAt',
    header: 'Created At',
  },
  // {
  //   accessorKey: 'total',
  //   header: 'Total',
  // },
]

const rows = computed(() =>
  unanalyzedReceipts.value.map(r => ({
    id: r.id,
    // title: r.title || `Receipt #${r.id}`,
    createdAt: timestampUtils.toGermanISODate(r.createdAt),
    filename: r.uploads?.[0]?.originalFilename || '—',
    total: r.total ? `€ ${r.total}` : '—',
  })),
)

// Default all rows NOT selected;
const rowSelection = ref({})

const selectedReceipts = computed(() =>
  Object.keys(rowSelection.value)
    .filter(i => rowSelection.value[i])
    .map(i => rows.value[i])
    .filter(Boolean)
    .map(r => ({ id: r.id, filename: r.filename })),
)

// Reset selection whenever the slideover opens
watch(open, (isOpen) => {
  if (isOpen) {
    rowSelection.value = {}
  }
})

function onSelect (evt, row) {
  row.toggleSelected(!row.getIsSelected())
}
</script>

<template>
  <div>
    <USlideover
      v-model:open="open"
      title="Bulk Analyze"
      description="Run AI analysis on all the following receipts missing analyses."
      :ui="{ footer: 'justify-end', close: 'cursor-pointer' }"
    >
      <template #body>
        <p
          v-if="unanalyzedReceipts.length === 0"
          class="text-sm text-slate-500"
        >
          All receipts have already been analyzed.
        </p>
        <UTable
          v-else
          v-model:row-selection="rowSelection"
          :data="rows"
          :columns="columns"
          @select="onSelect"
        />

        <pre><code>{{ selectedReceipts }}</code></pre>
      </template>

      <template #footer>
        <UButton
          label="Cancel"
          color="neutral"
          variant="outline"
          class="cursor-pointer"
          @click="open = false"
        />
        <UButton
          label="Analyze"
          color="primary"
          :disabled="selectedReceipts.length === 0"
        />
      </template>
    </USlideover>
  </div>
</template>
