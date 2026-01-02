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
    accessorKey: 'hashId',
    header: 'Hash ID',
    cell: ({row}) => `${row.getValue('hashId')}`
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

const tableStyles = {
  base: 'min-w-full',
  thead: 'bg-slate-50',
  th: 'text-slate-700',
  td: 'align-top'
}


// Format timestamp for display
const formatDate = (timestamp) => {
  if (timestamp === null) {
    return '-'
  }
  return new Date(timestamp).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
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

const statusBadgeColor = function (status) {
  if (status === 'uploaded') {
    return 'info'
  }
  if (status === 'failed') {
    return 'error'
  }
  if (status === 'initialized') {
    return 'neutral'
  }
  return 'neutral'
}

const statusBadgeVariant = function (status) {
  if (status === 'uploaded') {
    return 'soft'
  }
  if (status === 'failed') {
    return 'soft'
  }
  if (status === 'initialized') {
    return 'outline'
  }
  return 'soft'
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
          <h1 class="font-bold text-3xl">Upload Records</h1>
          <p class="mt-1 text-slate-400">Database records for {{ userStore.fullName }}</p>
        </div>
        <button @click="refresh()" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors cursor-pointer">
          Refresh
        </button>
      </div>

      <ClientOnly>
        <div class="border bg-white border-slate-200 rounded-lg overflow-hidden">
        <UTable :data="uploads" :columns="columns" :ui="tableStyles" :loading="pending" loading-color="primary" loading-animation="carousel">
          <template #status-cell="{ row }">
            <UBadge
              :color="statusBadgeColor(row.original.status)"
              :variant="statusBadgeVariant(row.original.status)">
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
              {{ formatDate(row.original.receiptDate) }}
            </time>
          </template>
          <!--
          <template #uploadedAt-cell="{ row }">
            <time :datetime="row.original.uploadedAt" :title="row.original.uploadedAt">
              {{ formatDate(row.original.uploadedAt) }}
            </time>
          </template>
          -->
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

      <details>
        <summary class="font-bold text-xl">Raw Data</summary>
        <pre v-if="uploads" class="bg-slate-700  text-slate-100 p-6"><code>{{ uploads }}</code></pre>
      </details>

    </div>
  </UContainer>
</template>
