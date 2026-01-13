<script setup>
const props = defineProps({
  receipt: Object,
})

const route = useRoute()
const router = useRouter()

const tabItems = [
  {
    label: 'Overview',
    value: 'overview',
    slot: 'overview',
  },
  {
    label: 'Uploads',
    value: 'uploads',
    slot: 'uploads',
  },
  {
    label: 'Raw JSON',
    value: 'raw-json',
    slot: 'rawJson',
  },
]

const activeTab = computed({
  get () {
    return (route.query.tab) || 'overview'
  },
  set (tab) {
    router.push({
      path: route.path,
      query: { tab },
    })
  },
})

const schemaCheck = zodSchemas.receiptSchema.safeParse(props.receipt)
if (!schemaCheck.success) {
  console.error('Receipt schema validation failed:', schemaCheck.error)
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="mt-3">
      <h1 class="font-bold text-3xl mb-2">
        {{ props.receipt.merchantName || `Receipt #${props.receipt.id}` }}
      </h1>
    </div>

    <!-- Tabs -->
    <UTabs
      v-model="activeTab"
      :items="tabItems"
      size="xl"
      variant="link"
      class="w-full"
      :ui="{ indicator: 'border-b-3 border-primary', trigger: 'cursor-pointer' }"
    >
      <!-- eslint-disable-next-line vue/no-unused-vars -->
      <template #overview="{ item }">
        <UAlert
          v-if="!schemaCheck.success"
          title="Schema Validation Error"
          description="The receipt data does not match the expected schema. Some fields may not display correctly."
          class="my-5"
          color="warning"
          variant="subtle"
          icon="i-lucide-triangle-alert"
        />
        <ReceiptOverviewTab :receipt="receipt" />
      </template>

      <!-- eslint-disable-next-line vue/no-unused-vars -->
      <template #uploads="{ item }">
        <div class="pt-6 px-4">
          <div v-if="receipt.uploads && receipt.uploads.length > 0">
            <h2 class="text-xl font-semibold mb-4">
              Related Uploads ({{ receipt.uploads.length }})
            </h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div v-for="upload in receipt.uploads" :key="upload.id" class="border border-slate-200 rounded-lg p-4">
                <NuxtLink :to="`/uploads/${upload.hashId}`">
                  <AzureBlobImage
                    v-if="upload.thumbnailName"
                    :blobName="upload.thumbnailName"
                    :alt="upload.originalFilename"
                    class="w-full h-32 object-cover rounded mb-2"
                  />
                  <div class="text-sm">
                    <div class="font-medium text-slate-800 truncate">
                      {{ upload.title }}
                    </div>
                    <div class="text-slate-500 text-xs mt-1">
                      {{ upload.originalFilename }}
                    </div>
                    <div v-if="upload.analyzedAt" class="text-slate-400 text-xs mt-1">
                      Analyzed: {{ timestampUtils.toShortDate(upload.analyzedAt) }}
                    </div>
                  </div>
                </NuxtLink>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-12">
            <p class="text-slate-400">
              No uploads linked to this receipt
            </p>
          </div>
        </div>
      </template>

      <!-- eslint-disable-next-line vue/no-unused-vars -->
      <template #rawJson="{ item }">
        <div class="bg-slate-800 p-4">
          <vue-json-pretty
            :data="props.receipt"
            :indent="2"
            :deep="4"
            :showIcon="true"
            :showLength="true"
          />
        </div>
      </template>
    </UTabs>
  </div>
</template>
