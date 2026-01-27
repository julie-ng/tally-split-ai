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
  highlightTotal: {
    type: Boolean,
    required: false,
    default: false,
  },
  totalsMatch: {
    type: Boolean,
    required: false,
    default: true,
  },
})

/**
 * Setup Tags Array
 */
const tags = computed(() => {
  // First exclude internal tags
  const filteredString = azureUtils.excludeInternalBlobTags(props.tagsAsString)
  const allTags = azureUtils.blobTagsJsonToObject(filteredString)

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

/**
 * Customized Styles
 */
const shouldHighlight = key => props.highlightTotal && key === 'receipt-total'

const tagColor = (key) => {
  let color = 'neutral' // default
  if (shouldHighlight(key)) {
    color = props.totalsMatch
      ? 'info'
      : 'error'
  }
  return color
}

const tagVariant = (key) => {
  // console.log(`tagColor() ${props.highlightTotal}`, key)
  return shouldHighlight(key)
    ? 'subtle'
    : 'soft'
}

const extraClasses = (key) => {
  return shouldHighlight(key)
    ? ''
    : 'text-slate-500'
}
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <UBadge
      v-for="tag in tags"
      :key="tag.key"
      :color="tagColor(tag.key)"
      :variant="tagVariant(tag.key)"
      :class="extraClasses(tag.key)"
    >
      {{ tag.key }}: {{ tag.value }}
    </UBadge>
  </div>
</template>
