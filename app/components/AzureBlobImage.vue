<script setup>
const props = defineProps({
  blobName: {
    type: String,
    required: true
  },
  alt: {
    type: String,
    default: 'Azure Blob Image'
  }
})

// State
const blobUrl = ref(null)
const sasToken = ref(null)
const expiresAt = ref(null)
const loading = ref(true)
const error = ref(null)

// Computed - Full URL with SAS token
const imageUrl = computed(() => {
  if (!blobUrl.value || !sasToken.value) return null
  return `${blobUrl.value}?${sasToken.value}`
})

// Fetch SAS token
const fetchSasToken = async () => {
  loading.value = true
  error.value = null

  try {
    const response = await $fetch('/api/tokens/read', {
      method: 'POST',
      body: {
        action: 'read',
        blobName: props.blobName
      }
    })

    blobUrl.value = response.blobUrl
    sasToken.value = response.sasToken
    expiresAt.value = response.expiresAt

    console.log(`🔑 SAS token fetched for ${props.blobName}, expires at ${expiresAt.value}`)
  } catch (err) {
    error.value = err
    console.error('Failed to fetch SAS token:', err)
  } finally {
    loading.value = false
  }
}

// Fetch token on mount
onMounted(() => {
  fetchSasToken()
})

// Optional: Auto-refresh token before expiry
// Uncomment to enable auto-refresh 30 seconds before expiry
/*
watch(expiresAt, (newExpiresAt) => {
  if (newExpiresAt) {
    const expiryTime = new Date(newExpiresAt).getTime()
    const now = Date.now()
    const timeUntilExpiry = expiryTime - now
    const refreshTime = timeUntilExpiry - 30000 // 30 seconds before expiry

    if (refreshTime > 0) {
      setTimeout(() => {
        console.log('🔄 Auto-refreshing SAS token...')
        fetchSasToken()
      }, refreshTime)
    }
  }
})
*/
</script>

<template>
  <ClientOnly>
    <div class="azure-blob-image">
      <!-- Loading state -->
      <div v-if="loading" class="flex items-center justify-center p-10 bg-slate-50 rounded">
        <UIcon name="i-lucide-loader" class="animate-spin text-3xl text-slate-400" />
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="p-6 bg-red-50 border border-red-200 rounded">
        <p class="text-red-600 font-medium">Failed to load image</p>
        <p class="text-red-500 text-sm mt-1">{{ error.message }}</p>
        <UButton @click="fetchSasToken" class="mt-3" color="error" variant="soft" size="sm">
          Retry
        </UButton>
      </div>

      <!-- Image -->
      <img
        v-else-if="imageUrl"
        :src="imageUrl"
        :alt="alt"
        class="w-full rounded"
      />

      <!-- Fallback -->
      <div v-else class="p-6 bg-slate-50 rounded text-center text-slate-500">
        No image available
      </div>
    </div>
  </ClientOnly>
</template>

<style scoped>
.azure-blob-image img {
  display: block;
  max-width: 100%;
  height: auto;
}
</style>
