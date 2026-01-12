<script setup>
const props = defineProps({
  tagsAsString: {
    type: String,
    required: true,
  },
  filter: {
    type: Array, // tags to keep
    required: false,
    default: () => [],
  },
})

const tags = computed(() => {
  const allTags = azureUtils.blobTagsJsonToObject(props.tagsAsString)

  // If no filter specified, return all tags
  if (props.filter.length === 0) {
    return allTags
  }
  else {
    // Filter to only include specified keys
    const filtered = []
    allTags.forEach((tag) => {
      if (props.filter.includes(tag.key)) {
        filtered.push(tag)
      }
    })
    return filtered
  }
})
</script>

<template>
  <div class="flex flex-wrap gap-2 pt-2">
    <UBadge
      v-for="tag in tags"
      :key="tag.key"
      class="text-slate-500"
      color="neutral"
      variant="soft"
    >
      {{ tag.key }}: {{ tag.value }}
    </UBadge>
  </div>
</template>
