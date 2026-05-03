<script setup>
import { useTokensStore } from '~/stores/tokens.store'

const props = defineProps({
  blobName: {
    type: String,
    required: true,
  },
  alt: {
    type: String,
    required: false,
    default: '',
  },
})

const tokensStore = useTokensStore()

const imageUrl = ref('')
const loading = ref(true)
const error = ref(null)

watchEffect(async () => {
  if (!props.blobName) return
  loading.value = true
  error.value = null
  try {
    imageUrl.value = await tokensStore.getReadUrl(props.blobName)
  }
  catch (err) {
    error.value = err
  }
  finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <loading-placeholder v-if="loading" title="Loading Image" />

    <UAlert
      v-else-if="error"
      title="Unable to Load Image"
      :description="error.message"
      class="my-5"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
    />

    <img
      v-else-if="imageUrl"
      :src="imageUrl"
      :alt="alt || blobName"
      :data-blob-name="blobName"
      class="w-full h-auto"
    >
  </div>
</template>
