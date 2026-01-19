<script setup>
const props = defineProps({
  blobName: {
    type: String,
    required: true,
  },
  blobUrl: {
    type: String,
    required: true,
  },
  ui: {
    type: Object,
    required: false,
    default: () => {},
  },
})

const uiClasses = computed(() => {
  if (props.ui && Object.hasOwn(props.ui, 'class')) {
    return props.ui.class
  }
  else {
    return ''
  }
})

async function openBlobWithSas () {
  const data = await $fetch('/api/tokens/read', {
    method: 'POST',
    body: {
      action: 'read',
      blobName: props.blobName,
    },
  })

  if (data?.blobUrlWithSas) {
    window.open(data.blobUrlWithSas, '_blank')
  }
}
</script>

<template>
  <a
    :href="blobUrl"
    :class="uiClasses"
    target="_blank"
    @click.prevent="openBlobWithSas"
  >
    <slot>{{ blobName }}</slot>
  </a>
</template>
