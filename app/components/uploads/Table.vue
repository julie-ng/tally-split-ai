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
  // {
  //   accessorKey: 'id',
  //   header: 'Upload ID',
  // },
  {
    id: 'tile',
    enableSorting: false,
    header: '',
    meta: { class: { th: 'w-[52px] pr-0', td: 'w-[52px] pr-0' } },
  },
  {
    accessorKey: 'originalFilename',
    header: 'Upload',
  },
  {
    id: 'receiptDate',
    accessorFn: row => row.receipt?.date ?? null,
    header: sortableHeader('Receipt Date'),
    sortUndefined: 'last',
    meta: { class: { th: 'w-[110px]', td: 'w-[110px] text-right' } },
  },
  {
    accessorKey: 'workflow',
    header: 'Progress',
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
]

const tableStyles = {
  base: 'min-w-full',
  th: 'text-toned font-semibold',
  td: 'p-3 align-middle',
  tr: 'hover:bg-elevated/50',
}

const tableMeta = computed(() => ({
  class: {
    tr: row => row?.original?.id === props.previewId ? 'bg-elevated/90' : '',
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

        <!-- Header-less tile column: a live, reactive icon (in-flight / error /
             receipt) that flips as the pipeline runs. Own column so the "Upload"
             header aligns with the text, not the tile. -->
        <template #tile-cell="{ row }">
          <UploadTile
            :id="row.original.id"
            :status="row.original.status"
            :receipt="row.original.receipt"
          />
        </template>

        <template #originalFilename-cell="{ row }">
          <!-- Two lines: expense title (receipt.title) on top, original filename
               below in smaller dimmed text. When there's no title yet (in-flight/
               failed), the filename becomes the primary line so the row is still
               identifiable.

               create-expense copies receipt.title → expense.title at creation,
               so they START equal — but BOTH are independently editable and can
               DRIFT. We surface receipt.title only because it's already on this
               row's join and no expense is joined. TODO (design-direction
               cleanup): the UI should read expense.title from a backend API that
               presents it as such. Architectural — touches many components. -->
          <div
            class="min-w-0"
            :class="previewId ? 'max-w-[220px] md:max-w-[260px] xl:max-w-[340px]' : ''"
          >
            <template v-if="row.original.receipt?.title">
              <p :title="row.original.receipt.title" class="truncate text-toned font-medium">
                {{ row.original.receipt.title }}
              </p>
              <p :title="row.original.originalFilename" class="truncate text-xs text-dimmed">
                {{ row.original.originalFilename }}
              </p>
            </template>
            <p v-else :title="row.original.originalFilename" class="truncate text-dimmed">
              {{ row.original.originalFilename }}
            </p>
          </div>
        </template>

        <template #receiptDate-cell="{ row }">
          <UTooltip
            v-if="row.original.receipt?.date"
            :text="dateUtils.formatISODate(row.original.receipt.date)"
            :delay-duration="0"
          >
            <time :datetime="row.original.receipt.date" class="tabular-nums">
              {{ dateUtils.formatDayMonth(row.original.receipt.date) }}
            </time>
          </UTooltip>
          <span v-else class="text-dimmed">—</span>
        </template>

        <template #uploadedAt-cell="{ row }">
          <UTooltip
            v-if="row.original.uploadedAt"
            :text="timestampUtils.toShortDatetime(row.original.uploadedAt)"
            :delay-duration="0"
          >
            <time :datetime="row.original.uploadedAt">
              {{ timestampUtils.toRelative(row.original.uploadedAt) }}
            </time>
          </UTooltip>
          <span v-else>—</span>
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
