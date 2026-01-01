<script setup>
import { useUserStore } from '~/stores/user.store'

useHead({
  title: 'My Uploads'
})

const userStore = useUserStore()

const { data, pending, error } = await useFetch('/api/blobs', {
  query: { userId: userStore.userId }
})
</script>

<template>
  <UContainer>
    <div class="my-5">
      <h1 class="font-bold text-3xl">My Uploads</h1>
      <p class="mt-1 text-slate-400">{{ userStore.fullName }}'s uploaded receipts</p>

      <!-- Loading state -->
      <div v-if="pending" class="mt-10">
        <p class="text-slate-500">Loading your uploads...</p>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="mt-10 p-5 bg-red-50 border border-red-200 rounded">
        <p class="text-red-600 font-medium">Error loading uploads</p>
        <p class="text-red-700 text-sm">{{ error.message }}</p>
      </div>

      <!-- Empty state -->
      <div v-else-if="!data?.blobs || data.blobs.length === 0" class="mt-10 text-center py-20">
        <p class="text-slate-400 text-lg mb-4">No uploads yet</p>
        <NuxtLink to="/uploads/new" class="text-blue-600 hover:text-blue-800 underline">
          Upload your first receipt
        </NuxtLink>
      </div>

      <!-- Blobs list -->
      <div v-else class="mt-10">
        <p class="text-slate-600 mb-5">
          Found {{ data.count }} upload{{ data.count !== 1 ? 's' : '' }}
        </p>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <article
            v-for="blob in data.blobs"
            :key="blob.filename"
            class="p-5 bg-white border border-slate-200 rounded-lg hover:shadow-md transition-shadow"
          >
            <!-- Image thumbnail -->
            <div class="mb-4 bg-slate-100 rounded overflow-hidden">
              <img
                :src="blob.sasUrl"
                :alt="blob.filename"
                class="w-full h-48 object-cover"
                loading="lazy"
              />
            </div>

            <!-- Blob info -->
            <h2 class="font-semibold text-slate-700 mb-2">
              {{ blob.filename.split('/').pop() }}
            </h2>

            <!-- Tags -->
            <section v-if="blob.tags && Object.keys(blob.tags).length > 0" class="mb-3 text-slate-400">
              <header>
                <h1 class="my-2 text-sm text-slate-600 font-medium">Azure Tags</h1>
              </header>
              <article v-if="blob.tags['receipt-date']" class="text-sm text-slate-500 mb-1">
                <div class="inline-block w-24">receipt-date</div>
                <div class="inline-block mb-1">{{ blob.tags['receipt-date'] }}</div>
              </article>
              <article v-if="blob.tags['receipt-total']" class="text-sm text-slate-500 mb-1">
                <div class="inline-block w-24">receipt-total</div>
                <div class="inline-block mb-1">${{ blob.tags['receipt-total'] }}</div>
              </article>
              <article v-if="blob.tags['receipt-tags']" class="text-sm text-slate-500 mb-1">
                <div class="inline-block w-24">receipt-tags</div>
                <div class="inline-block mb-1">{{ blob.tags['receipt-tags'] }}</div>
              </article>
            </section>

            <!-- Upload date -->
            <p class="text-xs text-slate-400 mb-3">
              Uploaded {{ new Date(blob.uploadedAt).toLocaleDateString() }}
            </p>

            <!-- Actions -->
            <div class="flex gap-2">
              <a
                :href="blob.sasUrl"
                target="_blank"
                class="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                View Full Size
              </a>
            </div>
          </article>
        </div>
      </div>
    </div>
  </UContainer>
</template>
