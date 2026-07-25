<script setup>
import { useTokensStore } from '~/stores/tokens.store'

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

const tokensStore = useTokensStore()

const uiClasses = computed(() => {
  if (props.ui && Object.hasOwn(props.ui, 'class')) {
    return props.ui.class
  }
  else {
    return ''
  }
})

async function openBlobWithSas () {
  const url = await tokensStore.getReadUrl(props.blobName)
  if (url) window.open(url, '_blank')
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
