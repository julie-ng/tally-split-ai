<script setup>
const props = defineProps({
  upload: Object
})


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
      <p>This is the {{ item.label }} tab.</p>
    </template>
    <template #analysis="{ item }">
      <p>This is the {{ item.label }} tab.</p>
    </template>
    <template #rawJson="{ item }">
      <p>This is the {{ item.label }} tab.</p>
    </template>
  </UTabs>

   <!-- <pre><code>{{ props.upload }}</code></pre> -->

</div>
</template>
