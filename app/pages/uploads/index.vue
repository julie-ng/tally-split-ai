<script setup>
import { useUserStore } from '~/stores/user.store'

useHead({
  title: 'Uploads'
})

const userStore = useUserStore()

// TODO: handle errors, pending, and refresh
const { data: uploads, pending, error, refresh } = await useFetch('/api/uploads',
  {
    query: { userId: userStore.userId },
    lazy: true
})

const columns = [
  // {
  //   accessorKey: 'id',
  //   header: '#',
  //   cell: ({row}) => `${row.getValue('id')}`
  // },
  {
     id: 'expand',
     cell: ({ row }) =>
       h(UButton, {
         color: 'neutral',
         variant: 'ghost',
         icon: 'i-lucide-chevron-down',
         square: true,
         'aria-label': 'Expand',
         ui: {
           leadingIcon: [
             'transition-transform',
             row.getIsExpanded() ? 'duration-200 rotate-180' : ''
           ]
         },
         onClick: () => row.toggleExpanded()
       })
   },//
  {
    accessorKey: 'hashId',
    header: 'Hash ID',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({row}) => `${row.getValue('status')}`
  },
  {
    accessorKey: 'receiptDate',
    header: 'Receipt Date',
  },
  {
    accessorKey: 'title',
    header: 'Title',
  },
  // {
  //   accessorKey: 'blobName',
  //   header: 'Blob Name',
  // },
  {
    accessorKey: 'size',
    header: 'Size',
    cell: ({row}) => `${formatBytes(row.getValue('size'))}`
  },
  // {
  //   accessorKey: 'uploadedAt',
  //   header: 'Uploaded',
  // },
  {
    accessorKey: 'azureTags',
    header: 'Blob Tags',
  },
  {
    accessorKey: 'actions',
    header: 'Actions',
  }
]

const expanded = ref({ 1: true })

const tableStyles = {
  base: 'min-w-full',
  thead: 'bg-slate-50',
  th: 'text-slate-700',
  td: 'align-top',
  tr: 'data-[expanded=true]:bg-elevated/50'
}

const azureTags = function(str) {
  const data = JSON.parse(str)
  const result = []
  for (const [key, value] of Object.entries(data)) {
    result.push({
      key: key,
      value: value
    })
  }
  // console.log(typeof str, result)
  return result
}

const deleteUpload = async (hashId, title, blobName) => {
  if (!confirm(`Are you sure you want to delete '${title}' (${blobName})?`)) {
    return
  }

  try {
    await $fetch(`/api/uploads/${hashId}`, {
      method: 'DELETE'
    })

    // Refresh the table data
    refresh()
  } catch (error) {
    console.error('Failed to delete upload:', error)
    alert('Failed to delete upload. Please try again.')
  }
}

const analyzeReceipt = async (hashId) => {
  try {
    await $fetch(`/api/analyze/${hashId}`, {
      method: 'POST'
    })

    // Refresh table to show updated status
    refresh()
  } catch (error) {
    console.error('Failed to analyze receipt:', error)
    alert('Failed to analyze receipt. Please try again.')
  }
}

const getAnalyzeButtonText = (status) => {
  switch(status) {
    case 'processing': return 'Analyzing...'
    case 'completed': return 'Analyzed'
    case 'failed': return 'Retry'
    default: return 'Analyze'
  }
}
</script>

<template>
  <UContainer>
    <div class="my-5">
      <div class="flex justify-between items-center mb-5">
        <div>
          <h1 class="font-bold text-2xl">Uploads</h1>
          <p class="mt-1 text-sm text-slate-400">Database records for {{ userStore.userId }}</p>
        </div>
        <UButton @click="refresh()"
        class="px-4 py-2 cursor-pointer"
        >
          Refresh
        </UButton>
      </div>

      <ClientOnly>
        <div class="border bg-white border-slate-200 rounded-lg overflow-hidden">
        <UTable
          :data="uploads"
          :columns="columns"
          :ui="tableStyles"
          :loading="pending"
          loading-color="primary"
          loading-animation="carousel"
          v-model:expanded="expanded"
          class="flex-1"
          >
          <template #expanded="{ row }">
            <Shiki v-if="uploads" lang="json" :code="JSON.stringify(row.original, null, 2)" class="bg-white text-sm" />
          </template>
          <template #hashId-cell="{ row }">
            <NuxtLink
              :to="`/uploads/${row.original.hashId}`"
              class="text-blue-600 hover:text-blue-800 hover:underline font-mono"
            >
              {{ row.original.hashId }}
            </NuxtLink>
          </template>
          <template #status-cell="{ row }">
            <UBadge
              :color="badgeStyleHelpers.statusBadgeColor(row.original.status)"
              :variant="badgeStyleHelpers.statusBadgeVariant(row.original.status)">
              {{ row.original.status }}
            </UBadge>
          </template>
          <template #title-cell="{ row }">
            <div class="mb-1 text-slate-800 font-medium">
              {{ row.original.title }}
            </div>
            <a
              :href="row.original.blobUrl"
              class="font-xs text-slate-400 hover:underline"
              target="_blank">
                {{ row.original.originalFilename }}
            </a>
          </template>
          <!--
          <template #blobName-cell="{ row }">
            <a
              :href="row.original.blobUrl"
              class="text-slate-700 hover:underline"
              target="_blank">
                {{ row.original.originalFilename }}
            </a>
          </template>
          -->
          <template #receiptDate-cell="{ row }">
            <time :datetime="row.original.receiptDate" :title="row.original.receiptDate">
              {{ timestampUtils.toShortDatetime(row.original.receiptDate) }}
            </time>
          </template>
          <template #azureTags-cell="{ row }">
            <div v-if="row.original.azureTags != null" v-for="tag, i in azureTags(row.original.azureTags)">
              <UBadge :key="`${row.original.hashId}-tag-${tag.key}-${i}`"
                color="info"
                variant="soft"
                class="my-1 mr-1 text-slate-400">
                {{ tag.key }}: {{ tag.value }}
              </UBadge>
          </div>
          </template>
          <template #actions-cell="{ row }">
            <UButton
              loading-icon="i-lucide-loader"
              loading-auto
              @click="analyzeReceipt(row.original.hashId)"
              :disabled="row.original.analysisStatus === 'processing' || row.original.analysisStatus === 'completed'"
              color="info"
              variant="soft"
              class="px-3 py-1 text-sm rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed mr-2 cursor-pointer"
            >
              {{ getAnalyzeButtonText(row.original.analysisStatus) }}
            </UButton>
            <UButton
              @click="deleteUpload(row.original.hashId, row.original.title, row.original.blobName)"
              color="error"
              variant="soft"
              class="px-3 py-1 rounded transition-colors cursor-pointer"
            >
              Delete
            </UButton>
          </template>
        </UTable>
        </div>
      </ClientOnly>

      <!--
      <details>
        <summary class="font-bold text-xl">Raw Data</summary>
        <Shiki v-if="uploads" lang="json" :code="JSON.stringify(uploads, null, 2)" class="bg-white p-6" />
      </details>
      -->

    </div>
  </UContainer>
</template>

<style scoped>
pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-x: auto;
  max-width: 100%;
}
</style>
