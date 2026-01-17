<script setup>
defineProps({
  // Expects array per /api/blobs
  blobs: Array,
})
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
    <article
      v-for="blob in blobs"
      :key="blob.filename"
    >
      <UCard>
        <template #header>
          <!-- Blob Name -->
          <h2 class="font-semibold text-blue-800 font-mono">
            <a :href="blob.sasUrl" target="_blank" class="hover:underline">
              {{ azureUtils.removeUsernamePrefixFromBlobname(blob.filename) }}
            </a>
          </h2>
        </template>

        <!-- Image thumbnail -->
        <div class="mb-4 bg-slate-100 overflow-hidden border border-slate-200">
          <a :href="blob.sasUrl" target="_blank">
            <img
              :src="blob.sasUrl"
              :alt="blob.filename"
              class="w-full h-36 object-cover"
              loading="lazy"
            >
          </a>
        </div>

        <div class="grid grid-cols-[8rem_1fr] gap-2 text-sm text-slate-500">
          <div>
            Uploaded At
          </div>
          <div class="text-right">
            {{ dateUtils.formatISODate(blob.uploadedAt) }}
          </div>
          <div>
            Size
          </div>
          <div class="text-right">
            {{ formatBytes(blob.size) }}
          </div>
          <div>
            Content Type
          </div>
          <div class="text-right">
            {{ blob.contentType }}
          </div>
        </div>
        <div class="mt-4">
          <tags-object-list :tags="blob.tags" :ui="{ class: 'text-slate-400' }" />
        </div>
      </UCard>
    </article>
  </div>
</template>
