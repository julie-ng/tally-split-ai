<script setup>
import { h, resolveComponent } from 'vue'
import { getPaginationRowModel } from '@tanstack/vue-table'
import { UCheckbox } from '#components'
import { UPLOAD_STATUS } from '#shared/enums/upload-status.js'

const props = defineProps({
  data: {
    type: Array,
    required: true,
  },
  // Highlights the previewed row + drives the #id-cell link's ?preview target.
  previewId: {
    type: [String, null],
    default: null,
  },
  // Current preview tab — the #id-cell link keeps it sticky so clicking an ID
  // stays on whichever facet is open. URL ownership stays with the page; this
  // component only reads route.query to compose the link target.
  activeTab: {
    type: [String, null],
    default: null,
  },
  paginationInfo: {
    type: Object,
    default: () => ({ start: 0, end: 0, total: 0 }),
  },
  // The uploads store's fetch-in-flight flag — drives UTable's shimmer during
  // refetches (Refresh button, post-delete refresh).
  loading: {
    type: Boolean,
    default: false,
  },
  showPagination: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['select'])
const pagination = defineModel('pagination', {
  type: Object,
  default: () => ({ pageIndex: 0, pageSize: 50 }),
})
const sorting = defineModel('sorting', {
  type: Array,
  default: () => [{ id: 'uploadedAt', desc: true }],
})
const rowSelection = defineModel('rowSelection', {
  type: Object,
  default: () => ({}),
})

const route = useRoute()
const table = useTemplateRef('table')

// A DB-backed upload row is deletable; in-flight queue rows (queued/in-progress/
// failed/interrupted) have no DB record yet, so their checkbox is disabled and
// their ids never reach the batch-delete endpoint.
function isDeletableRow (upload) {
  return upload.status === UPLOAD_STATUS.UPLOADED
    || upload.status === UPLOAD_STATUS.INITIALIZED
}

function sortableHeader (label) {
  return ({ column }) => {
    const sorted = column.getIsSorted()
    return h(resolveComponent('UButton'), {
      variant: 'ghost',
      color: 'neutral',
      size: 'sm',
      class: '-mx-2',
      onClick: () => column.toggleSorting(),
      label,
      leadingIcon: sorted === 'asc'
        ? 'i-lucide-arrow-up-narrow-wide'
        : sorted === 'desc'
          ? 'i-lucide-arrow-down-wide-narrow'
          : 'i-lucide-arrow-up-down',
      ui: sorted ? undefined : { leadingIcon: 'text-dimmed' },
    })
  }
}

const columns = [
  {
    id: 'select',
    enableSorting: false,
    meta: { class: { th: 'w-[36px] px-2', td: 'w-[36px] px-2' } },
    header: ({ table }) => h(UCheckbox, {
      'modelValue': table.getIsSomePageRowsSelected() ? 'indeterminate' : table.getIsAllPageRowsSelected(),
      'onUpdate:modelValue': value => table.toggleAllPageRowsSelected(!!value),
      'ariaLabel': 'Select all',
    }),
    // Stop the click bubbling to the row's @select handler so ticking a box
    // doesn't also open the preview panel (box and row-click are independent).
    cell: ({ row }) => h('div', { onClick: e => e.stopPropagation() }, [
      h(UCheckbox, {
        'modelValue': row.getIsSelected(),
        'disabled': !row.getCanSelect(),
        'onUpdate:modelValue': value => row.toggleSelected(!!value),
        'ariaLabel': 'Select row',
      }),
    ]),
  },
  {
    accessorKey: 'id',
    header: 'Upload ID',
  },
  {
    accessorKey: 'originalFilename',
    header: 'File',
  },
  {
    accessorKey: 'size',
    header: sortableHeader('Size'),
    cell: ({ row }) => `${formatBytes(row.getValue('size'))}`,
  },
  {
    accessorKey: 'uploadedAt',
    header: sortableHeader('Uploaded'),
  },
  {
    accessorKey: 'workflow',
    header: 'Progress',
  },
]

const tableStyles = {
  base: 'min-w-full',
  th: 'text-toned font-semibold',
  td: 'p-3 align-middle',
  tr: 'hover:bg-elevated/50',
}

const tableMeta = computed(() => ({
  class: {
    tr: row => row?.original?.id === props.previewId ? 'bg-primary/10' : '',
  },
}))

// Deep-link awareness: jump to the page holding the previewed row. Shared with
// the expenses table via the composable.
usePreviewRowJump({
  previewId: () => props.previewId,
  data: () => props.data,
  sorting,
  tableApi: () => table.value?.tableApi,
})

function onSelect (event, row) {
  emit('select', event, row)
}
</script>

<template>
  <ClientOnly>
    <div class="border bg-default border-default">
      <!-- TODO: autoResetPageIndex configuration works now to keep page when deleting items. But it will break as soon as we try to use filters -->
      <UTable
        ref="table"
        v-model:pagination="pagination"
        v-model:sorting="sorting"
        v-model:row-selection="rowSelection"
        :pagination-options="{
          getPaginationRowModel: getPaginationRowModel(),
          autoResetPageIndex: false,
        }"
        :sorting-options="{
          enableSortingRemoval: false,
        }"
        :get-row-id="(row) => row.id"
        :enable-row-selection="(row) => isDeletableRow(row.original)"
        :data="data"
        :columns="columns"
        :meta="tableMeta"
        :ui="tableStyles"
        :loading="loading"
        loading-color="primary"
        loading-animation="carousel"
        class="flex-1"
        @select="onSelect"
      >
        <template #id-cell="{ row }">
          <!-- Keeps the current ?tab (sticky, matches openPreview) so clicking
               the ID stays on whichever facet you're viewing. -->
          <NuxtLink
            :to="{ query: { ...route.query, preview: row.original.id, tab: activeTab } }"
            replace
            class="text-dimmed hover:text-blue-800 hover:underline font-mono"
          >
            {{ row.original.id }}
          </NuxtLink>
        </template>

        <template #originalFilename-cell="{ row }">
          <div
            class="flex items-center gap-1.5"
            :class="previewId ? 'max-w-[200px] md:max-w-[240px] xl:max-w-[320px]' : ''"
          >
            <UTooltip
              v-if="row.original.receipt"
              text="View Receipt"
              :content="{ side: 'top' }"
              :delay-duration="0"
              arrow
            >
              <UButton
                :to="`/receipts/${row.original.receipt.id}`"
                icon="i-lucide-receipt-euro"
                size="xs"
                color="primary"
                variant="ghost"
              />
            </UTooltip>
            <span :title="row.original.originalFilename" class="truncate">
              {{ row.original.originalFilename }}
            </span>
          </div>
        </template>

        <template #uploadedAt-cell="{ row }">
          <time :datetime="row.original.uploadedAt" :title="row.original.uploadedAt">
            {{ timestampUtils.toShortDatetime(row.original.uploadedAt) }}
          </time>
        </template>

        <template #workflow-cell="{ row }">
          <uploads-workflow-steps
            :id="row.original.id"
            :upload-status="row.original.status"
          />
        </template>
      </UTable>

      <div v-if="showPagination" class="flex justify-between items-center border-t border-default py-4 px-4">
        <div class="text-sm text-toned">
          Showing {{ paginationInfo.start }}-{{ paginationInfo.end }} of {{ paginationInfo.total }}
        </div>
        <UPagination
          :page="pagination.pageIndex + 1"
          :items-per-page="pagination.pageSize"
          :total="paginationInfo.total"
          @update:page="(p) => table?.tableApi?.setPageIndex(p - 1)"
        />
      </div>

      <slot name="footer" />
    </div>
  </ClientOnly>
</template>
