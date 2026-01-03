<script setup>
import { useUserStore } from '~/stores/user.store'

const route = useRoute()
const hashId = route.params.hashId

useHead({
  title: `Upload ${hashId}`
})

const userStore = useUserStore()

// Fetch upload details
const { data: upload, pending, error } = await useFetch(`/api/uploads/${hashId}`)

// Format timestamp for display
const formatDate = (timestamp) => {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const statusBadgeColor = function (status) {
  if (status === 'uploaded') return 'info'
  if (status === 'failed') return 'error'
  if (status === 'initialized') return 'neutral'
  return 'neutral'
}

const statusBadgeVariant = function (status) {
  if (status === 'uploaded') return 'soft'
  if (status === 'failed') return 'soft'
  if (status === 'initialized') return 'outline'
  return 'soft'
}

const azureTags = computed(() => {
  if (!upload.value?.azureTags) return []
  const data = JSON.parse(upload.value.azureTags)
  return Object.entries(data).map(([key, value]) => ({ key, value }))
})
</script>

<template>
  <UContainer>
    <div class="my-5">
      <!-- Back button -->
      <NuxtLink to="/uploads" class="inline-flex items-center text-slate-600 hover:text-slate-900 mb-4">
        <UIcon name="i-lucide-arrow-left" class="mr-2" />
        Back to Uploads
      </NuxtLink>

      <!-- Loading state -->
      <div v-if="pending" class="text-center py-10">
        <UIcon name="i-lucide-loader" class="animate-spin text-4xl" />
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 class="font-bold text-xl text-red-800 mb-2">Error Loading Upload</h2>
        <p class="text-red-600">{{ error.message }}</p>
      </div>

      <!-- Upload details -->
      <div v-else-if="upload">
        <!-- Header -->
        <div class="mb-6">
          <h1 class="font-bold text-3xl mb-2">{{ upload.title }}</h1>
          <div class="flex items-center gap-3 text-slate-500">
            <UBadge
              :color="statusBadgeColor(upload.status)"
              :variant="statusBadgeVariant(upload.status)">
              {{ upload.status }}
            </UBadge>
            <span>•</span>
            <span>{{ upload.hashId }}</span>
          </div>
        </div>

        <!-- Main content grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Left column - Details -->
          <div class="lg:col-span-2 space-y-6">
            <!-- Basic Information Card -->
            <div class="bg-white border border-slate-200 rounded-lg p-6">
              <h2 class="font-bold text-xl mb-4">Basic Information</h2>
              <dl class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt class="text-sm font-medium text-slate-500">Original Filename</dt>
                  <dd class="mt-1 text-slate-900">{{ upload.originalFilename }}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-slate-500">Blob Name</dt>
                  <dd class="mt-1 text-slate-900">{{ upload.blobName }}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-slate-500">Content Type</dt>
                  <dd class="mt-1 text-slate-900">{{ upload.contentType || '-' }}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-slate-500">Size</dt>
                  <dd class="mt-1 text-slate-900">{{ formatBytes(upload.size) }}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-slate-500">Receipt Date</dt>
                  <dd class="mt-1 text-slate-900">{{ formatDate(upload.receiptDate) }}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-slate-500">Uploaded At</dt>
                  <dd class="mt-1 text-slate-900">{{ formatDate(upload.uploadedAt) }}</dd>
                </div>
              </dl>
            </div>

            <!-- Azure Tags Card -->
            <div v-if="azureTags.length > 0" class="bg-white border border-slate-200 rounded-lg p-6">
              <h2 class="font-bold text-xl mb-4">Azure Blob Tags</h2>
              <div class="flex flex-wrap gap-2">
                <UBadge
                  v-for="tag in azureTags"
                  :key="tag.key"
                  color="info"
                  variant="soft"
                >
                  {{ tag.key }}: {{ tag.value }}
                </UBadge>
              </div>
            </div>

            <!-- Analysis Status Card -->
            <div v-if="upload.analysisStatus" class="bg-white border border-slate-200 rounded-lg p-6">
              <h2 class="font-bold text-xl mb-4">Analysis Status</h2>
              <dl class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt class="text-sm font-medium text-slate-500">Status</dt>
                  <dd class="mt-1">
                    <UBadge :color="upload.analysisStatus === 'completed' ? 'success' : 'neutral'">
                      {{ upload.analysisStatus }}
                    </UBadge>
                  </dd>
                </div>
                <div v-if="upload.analyzedAt">
                  <dt class="text-sm font-medium text-slate-500">Analyzed At</dt>
                  <dd class="mt-1 text-slate-900">{{ formatDate(upload.analyzedAt) }}</dd>
                </div>
              </dl>
            </div>

            <!-- Raw Data -->
            <details class="bg-white border border-slate-200 rounded-lg p-6">
              <summary class="font-bold text-xl cursor-pointer">Raw Data</summary>
              <div class="mt-4">
                <Shiki lang="json" :code="JSON.stringify(upload, null, 2)" class="text-sm" />
              </div>
            </details>
          </div>

          <!-- Right column - Preview & Actions -->
          <div class="space-y-6">
            <!-- Image Preview -->
            <div v-if="upload.blobName" class="bg-white border border-slate-200 rounded-lg p-6">
              <h2 class="font-bold text-xl mb-4">Preview</h2>
              <AzureBlobImage
                :blob-name="upload.blobName"
                :alt="upload.title"
              />
            </div>

            <!-- Actions -->
            <div class="bg-white border border-slate-200 rounded-lg p-6">
              <h2 class="font-bold text-xl mb-4">Actions</h2>
              <div class="space-y-3">
                <UButton
                  color="info"
                  variant="soft"
                  class="w-full"
                  :disabled="upload.analysisStatus === 'processing' || upload.analysisStatus === 'completed'"
                >
                  {{ upload.analysisStatus === 'completed' ? 'Analyzed' : 'Analyze Receipt' }}
                </UButton>
                <UButton
                  color="error"
                  variant="soft"
                  class="w-full"
                >
                  Delete Upload
                </UButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Not found state -->
      <div v-else class="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h2 class="font-bold text-xl text-yellow-800 mb-2">Upload Not Found</h2>
        <p class="text-yellow-600">No upload found with hash ID: {{ hashId }}</p>
      </div>
    </div>
  </UContainer>
</template>

<style scoped>
pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-x: auto;
  max-width: 100%;
}
</style>
