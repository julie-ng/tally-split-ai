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
  // {
  //   label: 'Uploads',
  //   value: 'uploads',
  //   slot: 'uploads',
  // },
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
  <div class="mt-3">
    <!-- Receipt Title -->
    <h1 class="font-bold text-3xl mb-2">
      <template v-if="props.receipt.title">
        {{ props.receipt.title }}
      </template>
      <template v-else>
        {{ `Receipt #${props.receipt.id}` }}
      </template>
    </h1>

    <div class="grid grid-cols-4 gap-4">
      <div id="main-col" class="col-span-3">
        <!-- Tabs -->
        <UTabs
          v-model="activeTab"
          :items="tabItems"
          size="xl"
          variant="link"
          class="w-full"
          :ui="{ indicator: 'border-b-3 border-primary', trigger: 'cursor-pointer' }"
        >
          <!-- Overview Tab -->
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
            <!-- <ReceiptOverviewTab :receipt="receipt" /> -->
            <receipt-overview-tab :receipt="receipt" />
          </template>

          <!-- eslint-disable-next-line vue/no-unused-vars -->
          <template #rawJson="{ item }">
            <receipt-raw-json-tab :receipt="receipt" />
          </template>
        </UTabs>
      </div>
      <div id="side-col" class="mt-5">
        <receipt-upload-column
          v-if="props.receipt.uploads.length > 0"
          :upload="props.receipt.uploads[0]"
        />
      </div>
    </div><!-- /.grid -->
  </div>
</template>
