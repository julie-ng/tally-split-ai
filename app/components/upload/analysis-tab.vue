<script setup>
const props = defineProps({
  upload: Object,
  analysisData: Object,
  analysisPending: Boolean,
  analysisError: Object,
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
    label: 'Analysis',
    value: 'analysis',
    slot: 'analysis',
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

const schemaCheck = zodSchemas.uploadObject.safeParse(props.upload)
if (!schemaCheck.success) {
  console.error(schemaCheck.error)
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="mt-3">
      <h1 class="font-bold text-3xl mb-2">
        {{ props.upload.title }}
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
        <upload-invalid-schema-alert v-if="!schemaCheck.success" />
        <upload-overview-tab-content :upload="upload" />
      </template>

      <!-- eslint-disable-next-line vue/no-unused-vars -->
      <template #analysis="{ item }">
        <upload-invalid-schema-alert v-if="!schemaCheck.success" />
        <upload-analysis-tab-content
          :upload="upload"
          :analysisData="analysisData"
          :analysisPending="analysisPending"
          :analysisError="analysisError"
        />
      </template>

      <!-- eslint-disable-next-line vue/no-unused-vars -->
      <template #rawJson="{ item }">
        <div class="bg-slate-800 p-4">
          <vue-json-pretty
            :data="props.upload"
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
