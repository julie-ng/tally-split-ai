<script setup>
const props = defineProps({
  blobs: {
    type: Array,
    required: true,
  },
})

const columns = [
  {
    accessorKey: 'filename',
    header: 'Filename',
  },
  {
    accessorKey: 'uploadedAt',
    header: 'Uploaded At',
  },
  {
    accessorKey: 'size',
    header: 'Size',
    meta: {
      class: {
        th: 'text-right',
        td: 'text-right',
      },
    },
  },
  {
    accessorKey: 'contentType',
    header: 'Content Type',
    meta: {
      class: {
        th: 'min-w-[150px]',
        td: 'min-w-[150px]',
      },
    },
  },
  {
    accessorKey: 'tags',
    header: 'Tags',
  },
]

const rows = computed(() => {
  return props.blobs.map(blob => ({
    filename: blob.filename,
    sasUrl: blob.sasUrl,
    uploadedAt: blob.uploadedAt,
    size: blob.size,
    contentType: blob.contentType,
    tags: blob.tags,
  }))
})
</script>

<template>
  <div>
    <UTable
      :columns="columns"
      :data="rows"
      :ui="{ th: 'font-medium' }"
      class="flex-1"
    >
      <template #filename-cell="{ row }">
        <a
          :href="row.original.sasUrl"
          target="_blank"
          class="font-mono text-blue-800 hover:underline"
        >
          {{ azureUtils.removeUsernamePrefixFromBlobname(row.original.filename) }}
        </a>
      </template>

      <template #uploadedAt-cell="{ row }">
        {{ dateUtils.formatISODate(row.original.uploadedAt) }}
      </template>

      <template #size-cell="{ row }">
        {{ formatBytes(row.original.size) }}
      </template>

      <template #tags-cell="{ row }">
        <tags-object-list :tags="row.original.tags" :ui="{ class: 'text-slate-400' }" />
      </template>
    </UTable>
  </div>
</template>
