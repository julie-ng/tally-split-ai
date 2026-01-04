<script setup>
const props = defineProps({
  upload: Object
})

const schemaCheck = zodSchemas.uploadObject.safeParse(props.upload)
if (!schemaCheck.success) {
  console.error(schemaCheck.error)
}

const tabItems = [
  {
    label: 'Overview',
    slot: 'overview'
  },
  {
    label: 'Analysis',
    slot: 'analysis'
  },
  {
    label: 'Raw JSON',
    slot: 'rawJson'
  }
]

const azureTags = computed(() => {
  return (upload.value?.azureTags)
    ? azureUtils.blobTagsJsonToObject(upload.value.azureTags)
    : []
})

</script>

<template>
<div>
  <!-- Header -->
   <div class="mt-3">
    <h1 class="font-bold text-3xl mb-2">{{ props.upload.title }}</h1>
  </div>


  <UTabs :items="tabItems" size="xl" variant="link" class="w-full" :ui="{ indicator: 'border-b-3 border-primary', trigger: 'cursor-pointer' }">
    <template #overview="{ item }">
      <UploadInvalidSchemaAlert v-if="!schemaCheck.success" />
      <UploadOverviewTabContent :upload="upload" />
    </template>

    <template #analysis="{ item }">
      <UploadInvalidSchemaAlert v-if="!schemaCheck.success" />
      <UploadAnalysisTabContent :upload="upload" />
    </template>

    <template #rawJson="{ item }">
      <p>This is the {{ item.label }} tab.</p>
      <pre><code>{{ props.upload }}</code></pre> <!-- Temp -->
    </template>
  </UTabs>



</div>
</template>
