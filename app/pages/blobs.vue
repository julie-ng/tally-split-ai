<script setup>
import { useUserStore } from '~/stores/user.store'

useHead({
  title: 'My Uploads',
})

const userStore = useUserStore()
const viewMode = ref('grid')

const { data, pending, error } = await useFetch('/api/blobs', {
  query: { userId: userStore.userId },
})
</script>

<template>
  <UContainer>
    <div class="my-5">
      <h1 class="font-bold text-3xl">
        Blobs
      </h1>
      <p class="mt-1 text-slate-400">
        {{ userStore.userId }}'s uploaded receipts
      </p>

      <!-- Loading state -->
      <div v-if="pending" class="mt-10">
        <p class="text-slate-500">
          Loading your uploads...
        </p>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="mt-10 p-5 bg-red-50 border border-red-200 rounded">
        <p class="text-red-600 font-medium">
          Error loading uploads
        </p>
        <p class="text-red-700 text-sm">
          {{ error.message }}
        </p>
      </div>

      <!-- Empty state -->
      <div v-else-if="!data?.blobs || data.blobs.length === 0" class="mt-10 text-center py-20">
        <p class="text-slate-400 text-lg mb-4">
          No uploads yet
        </p>
        <!-- TODO: open upload modal instead of navigating -->
        <span class="text-slate-400">
          Upload your first receipt
        </span>
      </div>

      <!-- Display Blobs -->
      <div v-else class="mt-10">
        <p class="text-slate-600 mb-5">
          Found {{ data.count }} blob{{ data.count !== 1 ? 's' : '' }} on Azure
        </p>
        <div class="mb-4">
          <ui-layout-toggle v-model="viewMode" />
        </div>

        <!-- Grid View -->
        <blob-grid v-if="viewMode === 'grid'" :blobs="data.blobs" />

        <!-- Table View -->
        <blob-table v-if="viewMode === 'list'" :blobs="data.blobs" />
      </div>
    </div>
  </UContainer>
</template>
